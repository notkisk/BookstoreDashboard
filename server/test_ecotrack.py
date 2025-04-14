import os
import sys
from ecotrack_excel_export import export_orders_to_ecotrack

# Get the current working directory
cwd = os.getcwd()
print(f"Current working directory: {cwd}")

# Check template path
template_path = os.path.join(cwd, 'templates', 'upload_ecotrack_v31.xlsx')
print(f"Template path: {template_path}")
print(f"Template exists: {os.path.exists(template_path)}")

# Check if we can import openpyxl
try:
    import openpyxl
    print("openpyxl imported successfully")
except ImportError as e:
    print(f"Failed to import openpyxl: {e}")

# Try to load the template
try:
    workbook = openpyxl.load_workbook(template_path, keep_vba=True, data_only=False)
    print("Template loaded successfully")
    print(f"Sheet names: {workbook.sheetnames}")
except Exception as e:
    print(f"Failed to load template: {e}")

# Test with minimal order data
test_orders = [{
    "id": 1,
    "customer": {
        "name": "Test Customer",
        "address": "123 Test St"
    },
    "items": [{
        "id": 1,
        "quantity": 1,
        "price": 10
    }]
}]

try:
    output_path = os.path.join(cwd, 'exports', 'test_export.xlsx')
    result = export_orders_to_ecotrack(test_orders, template_path, output_path)
    print(f"Export successful: {result}")
except Exception as e:
    print(f"Export failed: {str(e)}")
