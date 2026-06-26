import os
import json
import time
from pathlib import Path
from config import settings
from supabase import create_client

class MockResponse:
    def __init__(self, data):
        self.data = data

class MockQueryBuilder:
    def __init__(self, table_name, db_file):
        self.table_name = table_name
        self.db_file = db_file
        self.select_fields = "*"
        self.filters = []
        self.insert_data = None
        self.update_data = None

    def select(self, fields="*"):
        self.select_fields = fields
        return self

    def eq(self, field, value):
        self.filters.append((field, value))
        return self

    def insert(self, data):
        self.insert_data = data
        return self

    def update(self, data):
        self.update_data = data
        return self

    def _read_db(self):
        if not os.path.exists(self.db_file):
            return {"users": [], "goals": [], "tasks": []}
        try:
            with open(self.db_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"users": [], "goals": [], "tasks": []}

    def _write_db(self, db_data):
        with open(self.db_file, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=2)

    def execute(self):
        db_data = self._read_db()
        table_data = db_data.setdefault(self.table_name, [])

        if self.insert_data:
            # Handle list or single dict insert
            if isinstance(self.insert_data, list):
                inserted = []
                for item in self.insert_data:
                    new_item = item.copy()
                    if "id" not in new_item:
                        new_item["id"] = int(time.time() * 1000) + len(table_data)
                    table_data.append(new_item)
                    inserted.append(new_item)
                self._write_db(db_data)
                return MockResponse(inserted)
            else:
                new_item = self.insert_data.copy()
                if "id" not in new_item:
                    new_item["id"] = int(time.time() * 1000)
                table_data.append(new_item)
                self._write_db(db_data)
                return MockResponse([new_item])

        # Filter logic
        filtered = []
        for row in table_data:
            match = True
            for field, value in self.filters:
                if str(row.get(field)) != str(value):
                    match = False
                    break
            if match:
                filtered.append(row)

        if self.update_data:
            # Update matching rows
            for row in filtered:
                row.update(self.update_data)
            self._write_db(db_data)
            return MockResponse(filtered)

        return MockResponse(filtered)

class DatabaseWrapper:
    def __init__(self):
        self.use_mock = False
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        
        if getattr(settings, "USE_LOCAL_DB", False) or not url or url == "YOUR_SUPABASE_URL" or not key or key == "YOUR_SUPABASE_ANON_KEY":
            self.use_mock = True
            self.db_file = Path(__file__).resolve().parent / "db.json"
        else:
            try:
                self.client = create_client(url, key)
            except Exception:
                self.use_mock = True
                self.db_file = Path(__file__).resolve().parent / "db.json"

    def table(self, table_name):
        if self.use_mock:
            return MockQueryBuilder(table_name, self.db_file)
        else:
            return self.client.table(table_name)

db_wrapper = DatabaseWrapper()

def get_db():
    return db_wrapper
