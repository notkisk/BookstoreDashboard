"""
EcoTrack Excel Export for Orders

This module preserves the EXACT formatting, formulas, and validation rules of the EcoTrack delivery template Excel file
while adding order data rows in the correct locations.

Special considerations:
1. Uses openpyxl with keep_vba=True to preserve all macros and special properties
2. Only adds data without modifying any existing cells containing formulas or validation rules
3. Handles proper data type conversions (dates, numbers, text, etc.)
4. Maps column headers intelligently for reliable exports
"""

import os
import json
from datetime import datetime
import logging
import openpyxl
from openpyxl.utils import get_column_letter

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='ecotrack_export.log'
)
logger = logging.getLogger('ecotrack_export')

# Constants
TEMPLATE_FILENAME = 'upload_ecotrack_v31.xlsx'
DEFAULT_TEMPLATE_PATH = os.path.join(os.getcwd(), 'templates', TEMPLATE_FILENAME)
ERROR_LOG_PATH = os.path.join(os.getcwd(), 'exports', 'ecotrack_export_errors.log')

class EcoTrackExcelExporter:
    """Handles exporting orders to the EcoTrack template Excel file."""
    
    def __init__(self, template_path=None):
        """
        Initialize the exporter with the template file path.
        
        Args:
            template_path: Path to the EcoTrack template file.
                           If None, uses the default path.
        """
        self.template_path = template_path or DEFAULT_TEMPLATE_PATH
        self.column_mapping = {}
        self.header_row = 1  # Default to first row if not detected
        self.data_start_row = 2  # Default to second row if not detected
        self.log_errors = []
        
    def export_orders(self, orders, output_path=None):
        """
        Export orders to an EcoTrack Excel file using their template.
        
        Args:
            orders: List of order objects with customer and item details
            output_path: Path to save the Excel file. If None, a default path is used.
        
        Returns:
            Path to the saved Excel file
        """
        try:
            # If no output path specified, create one with timestamp
            if not output_path:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                output_dir = os.path.join(os.getcwd(), 'exports')
                # Create exports directory if it doesn't exist
                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(output_dir, f'ecotrack_export_{timestamp}.xlsx')
            
            # Log the operation
            logger.info(f"Starting export of {len(orders)} orders to {output_path}")
            logger.info(f"Using template: {self.template_path}")
            
            # Load the template workbook with all macros and formatting preserved
            workbook = openpyxl.load_workbook(self.template_path, keep_vba=True, data_only=False)
            
            # Get the active sheet (assumes the template uses the active sheet for data)
            sheet = workbook.active
            
            # Discover the column mappings and header row
            self._discover_column_mapping(sheet)
            
            # Add order data
            self._add_order_data(sheet, orders)
            
            # Save the workbook to the output path
            workbook.save(output_path)
            
            # Log any errors
            if self.log_errors:
                self._write_error_log()
                
            logger.info(f"Excel export completed successfully: {output_path}")
            return output_path
            
        except Exception as e:
            error_msg = f"Error exporting orders to Excel: {str(e)}"
            logger.error(error_msg)
            self.log_errors.append(error_msg)
            self._write_error_log()
            raise
            
    def _discover_column_mapping(self, sheet):
        """
        Discover the column headers in the template to map our data correctly.
        Uses case-insensitive matching and handles synonyms.
        
        Args:
            sheet: The Excel worksheet object
        """
        # Header mapping with synonyms (lowercase for case-insensitive matching)
        header_synonyms = {
            'ref': ['ref', 'reference', 'reference commande', 'commande ref', 'réf', 'référence'],
            'name': ['nom', 'destinataire', 'nom et prenom', 'nom et prénom', 'nom et prenom du destinataire', 'client'],
            'phone': ['telephone*', 'téléphone*', 'telephone', 'téléphone', 'tel', 'tél', 'tel1', 'numéro téléphone'],
            'phone2': ['telephone 2', 'téléphone 2', 'telephone2', 'téléphone2', 'tel2', 'tél2', 'numéro téléphone2', 'numéro secondaire'],
            'wilaya_code': ['code wilaya', 'wilaya code', 'code', 'cod wilaya'],
            'wilaya': ['wilaya', 'wilaya de livraison', 'w'],
            'commune': ['commune', 'commune de livraison', 'ville'],
            'address': ['adresse', 'adresse de livraison', 'address'],
            'product': ['produit', 'product', 'article', 'désignation', 'designation'],
            'weight': ['poids', 'poids (kg)', 'weight', 'kg'],
            'amount': ['montant', 'montant du colis', 'prix', 'price', 'cod', 'c.o.d'],
            'note': ['remarque', 'note', 'notes', 'commentaire', 'observation'],
            'fragile': ['fragile'],
            'exchange': ['échange', 'echange', 'exchange'],
            'pickup': ['pick up', 'pickup', 'ramassage'],
            'cod': ['recouvrement', 'c.o.d', 'cod', 'contre remboursement'],
            'stop_desk': ['stop desk', 'stopdesk', 'point de relais', 'point relais'],
            'map': ['lien map', 'map', 'carte', 'google map', 'link', 'url']
        }
        
        # Find the header row by scanning first 10 rows for keyword matches
        max_matches = 0
        header_row = 1
        
        for row in range(1, 11):  # Check first 10 rows
            matches = 0
            for col in range(1, sheet.max_column + 1):
                cell_value = sheet.cell(row=row, column=col).value
                if cell_value is not None:
                    cell_text = str(cell_value).lower().strip()
                    for _ in header_synonyms.values():
                        if any(synonym in cell_text for synonym in _):
                            matches += 1
                            break
            
            if matches > max_matches:
                max_matches = matches
                header_row = row
                
        self.header_row = header_row
        self.data_start_row = header_row + 1
        
        logger.info(f"Detected header row at row {self.header_row}, data starts at row {self.data_start_row}")
        
        # Map column indices to our field names, with special handling for phone/phone2
        # Track which columns we've already mapped to avoid duplicates
        mapped_columns = set()
        
        # Log all column headers to identify the exact value of the telephone column
        logger.info(f"===== COLUMN HEADERS DEBUG START =====")
        for col in range(1, sheet.max_column + 1):
            cell_value = sheet.cell(row=header_row, column=col).value
            if cell_value is not None:
                logger.info(f"Column {get_column_letter(col)} (col {col}): '{cell_value}'")
        logger.info(f"===== COLUMN HEADERS DEBUG END =====")
                
        # First, look for exact matches for telephone and telephone2
        for col in range(1, sheet.max_column + 1):
            cell_value = sheet.cell(row=header_row, column=col).value
            if cell_value is not None:
                cell_text = str(cell_value).lower().strip()
                logger.info(f"Processing column {get_column_letter(col)} (col {col}) with text: '{cell_text}'")
                
                # Expanded phone column matching with more variations
                if (cell_text == 'telephone' or 
                    cell_text == 'téléphone' or 
                    cell_text == 'telephone*' or 
                    cell_text == 'téléphone*' or
                    'telephone*' in cell_text or 
                    'téléphone*' in cell_text):
                    self.column_mapping['phone'] = col
                    mapped_columns.add(col)
                    logger.info(f"✓ Mapped 'phone' to column {get_column_letter(col)} (column {col})")
                elif (cell_text == 'telephone 2' or 
                      cell_text == 'téléphone 2' or 
                      cell_text == 'telephone2' or 
                      cell_text == 'téléphone2' or
                      'telephone 2' in cell_text or
                      'téléphone 2' in cell_text):
                    self.column_mapping['phone2'] = col  
                    mapped_columns.add(col)
                    logger.info(f"✓ Mapped 'phone2' to column {get_column_letter(col)} (column {col})")
        
        # Then map the rest of the columns
        for col in range(1, sheet.max_column + 1):
            if col in mapped_columns:
                continue
                
            cell_value = sheet.cell(row=header_row, column=col).value
            if cell_value is not None:
                cell_text = str(cell_value).lower().strip()
                
                # Try to map this column to a field by matching against synonyms
                for field, synonyms in header_synonyms.items():
                    # Skip already mapped fields
                    if field in self.column_mapping:
                        continue
                        
                    if any(synonym in cell_text for synonym in synonyms):
                        self.column_mapping[field] = col
                        mapped_columns.add(col)
                        logger.info(f"Mapped '{field}' to column {get_column_letter(col)} (column {col})")
                        break
        
        # Add one more debug logging of the complete mapping
        logger.info(f"===== FINAL COLUMN MAPPING =====")
        for field, col in self.column_mapping.items():
            column_letter = get_column_letter(col)
            header_value = sheet.cell(row=header_row, column=col).value
            logger.info(f"Field '{field}' mapped to column {column_letter} (col {col}) with header: '{header_value}'")
        logger.info(f"===== END FINAL COLUMN MAPPING =====")
        
        # Log missing mappings as warnings
        for field in header_synonyms.keys():
            if field not in self.column_mapping:
                warning = f"Warning: Could not find column for '{field}'"
                logger.warning(warning)
                self.log_errors.append(warning)
    
    def _add_order_data(self, sheet, orders):
        """
        Add order data to the sheet, preserving all template properties.
        
        Args:
            sheet: The Excel worksheet object
            orders: List of order objects
        """
        for i, order in enumerate(orders):
            if self.data_start_row is None:
                self.data_start_row = 2  # Default to row 2 if header detection failed
            row_num = self.data_start_row + i
            
            try:
                # Set values using our column mapping
                self._set_cell_value(sheet, row_num, 'ref', order.get('reference', ''))
                
                if 'customer' in order:
                    customer = order['customer']
                    self._set_cell_value(sheet, row_num, 'name', customer.get('name', ''))
                    
                    # Fix for customer phone - ensure it's directly from customer object
                    # Get phone directly from 'phone' property, with strict fallbacks
                    phone = ''
                    if 'phone' in customer and customer['phone']:
                        phone = str(customer['phone'])
                    elif order.get('customer', {}).get('phone'):
                        # Extra fallback if nested differently
                        phone = str(order['customer']['phone'])
                        
                    # Log the phone value for debugging
                    logger.info(f"Customer phone for row {row_num}: Raw value='{phone}'")
                    
                    # We no longer add a leading apostrophe - we'll handle this in the cell formatting
                    # Instead, ensure it's a clean string value
                    self._set_cell_value(sheet, row_num, 'phone', phone)
                    
                    # Same approach for phone2
                    phone2 = ''
                    if 'phone2' in customer and customer['phone2']:
                        phone2 = str(customer['phone2'])
                    elif order.get('customer', {}).get('phone2'):
                        # Extra fallback if nested differently
                        phone2 = str(order['customer']['phone2'])
                    
                    self._set_cell_value(sheet, row_num, 'phone2', phone2)
                    
                    # Handle address data
                    self._set_cell_value(sheet, row_num, 'wilaya_code', customer.get('wilaya', ''))
                    
                    # Look up wilaya name if available
                    wilaya_name = customer.get('wilayaName', '')
                    
                    self._set_cell_value(sheet, row_num, 'wilaya', wilaya_name)
                    
                    # Fix commune handling to use ONLY the raw commune name from the order/customer
                    # This should match exactly what was selected in the order form
                    commune = ''
                    
                    # First priority: Get the raw commune name from the order's commune field
                    if 'commune' in order and order['commune']:
                        commune = str(order['commune'])
                        logger.info(f"Using order.commune: '{commune}'")
                    # Second priority: Get from the customer commune field  
                    elif 'commune' in customer and customer['commune']:
                        commune = str(customer['commune'])
                        logger.info(f"Using customer.commune: '{commune}'")
                    # Last fallback: Try customer's commune property
                    elif order.get('customer', {}).get('commune'):
                        commune = str(order['customer']['commune'])
                        logger.info(f"Using order.customer.commune: '{commune}'")
                    
                    # For the commune, we need to look up the real name from the ID
                    # The commune is stored as an ID like "CommuneName_16"
                    if '_' in commune:
                        original_commune = commune
                        commune_id = commune
                        
                        # First try to find the real commune name by loading the location data
                        try:
                            import json
                            import os
                            
                            # Load location data to get real commune names
                            location_data_path = os.path.join(os.getcwd(), 'client', 'src', 'data', 'algeria_location_data.json')
                            
                            if os.path.exists(location_data_path):
                                with open(location_data_path, 'r', encoding='utf-8') as f:
                                    location_data = json.load(f)
                                    
                                # Find the commune by ID
                                commune_obj = next((c for c in location_data.get('communes', []) if c['id'] == commune_id), None)
                                
                                if commune_obj and 'name' in commune_obj:
                                    # Use the real commune name from location data
                                    commune = commune_obj['name']
                                    logger.info(f"Found real commune name from location data: '{commune}'")
                                else:
                                    # Fallback to splitting if commune not found
                                    commune = commune.split('_')[0].strip()
                                    logger.info(f"Commune not found in location data, using fallback: '{commune}'")
                            else:
                                # Fallback if location data file not found
                                commune = commune.split('_')[0].strip()
                                logger.info(f"Location data file not found, using fallback: '{commune}'")
                                
                        except Exception as e:
                            # Fallback if there's any error loading the data
                            commune = commune.split('_')[0].strip()
                            logger.error(f"Error finding real commune name: {e}. Using fallback: '{commune}'")
                            
                        logger.info(f"Processed commune from '{original_commune}' to '{commune}'")
                    
                    # Add detailed logging to debug commune issues
                    logger.info(f"Commune for row {row_num}: Final='{commune}'")
                    
                    # Always set the commune value if we have one
                    self._set_cell_value(sheet, row_num, 'commune', commune)
                    
                    # Set the address
                    address = customer.get('address', '')
                    self._set_cell_value(sheet, row_num, 'address', address)
                
                # Set product value as "livres" instead of book titles
                self._set_cell_value(sheet, row_num, 'product', "livres")
                
                # Don't set any weight value - leave it empty
                # Weight column will be left blank as requested
                
                # Set amount
                amount = order.get('finalAmount', order.get('totalAmount', 0))
                self._set_cell_value(sheet, row_num, 'amount', amount)
                
                # Set notes
                self._set_cell_value(sheet, row_num, 'note', order.get('notes', ''))
                
                # Set special flags
                self._set_cell_value(sheet, row_num, 'fragile', 'OUI' if order.get('fragile', False) else '')
                self._set_cell_value(sheet, row_num, 'exchange', 'OUI' if order.get('echange', False) else '')
                self._set_cell_value(sheet, row_num, 'pickup', 'OUI' if order.get('pickup', False) else '')
                self._set_cell_value(sheet, row_num, 'cod', 'OUI' if order.get('recouvrement', False) else '')
                self._set_cell_value(sheet, row_num, 'stop_desk', 'OUI' if order.get('stopDesk', False) else '')
                
                # Set map link if available
                if 'customer' in order and 'mapLink' in order['customer']:
                    self._set_cell_value(sheet, row_num, 'map', order['customer']['mapLink'])
                
            except Exception as e:
                error_msg = f"Error processing order {order.get('reference', 'Unknown')}: {str(e)}"
                logger.error(error_msg)
                self.log_errors.append(error_msg)
    
    def _set_cell_value(self, sheet, row, field, value):
        """
        Safely set a cell value based on our column mapping.
        
        Args:
            sheet: The Excel worksheet
            row: Row number
            field: Field name in our mapping
            value: Value to set
        """
        if field in self.column_mapping:
            column = self.column_mapping[field]
            try:
                # Handle different value types appropriately
                if isinstance(value, (int, float)) and field != 'phone' and field != 'phone2' and field != 'wilaya_code':
                    sheet.cell(row=row, column=column).value = value
                else:
                    # Convert to string and ensure proper formatting
                    if field == 'phone' or field == 'phone2' or field == 'wilaya_code':
                        # Ensure phone numbers and wilaya codes are treated as text
                        # Use a clean string value (no apostrophe prefix)
                        clean_value = str(value)
                        if clean_value.startswith("'"):
                            clean_value = clean_value[1:]  # Remove leading apostrophe if present
                            
                        sheet.cell(row=row, column=column).value = clean_value
                        sheet.cell(row=row, column=column).number_format = '@'  # Format as text
                    else:
                        sheet.cell(row=row, column=column).value = str(value)
            except Exception as e:
                error_msg = f"Error setting value for field '{field}' at row {row}: {str(e)}"
                logger.error(error_msg)
                self.log_errors.append(error_msg)
    
    def _write_error_log(self):
        """Write all logged errors to the error log file."""
        os.makedirs(os.path.dirname(ERROR_LOG_PATH), exist_ok=True)
        with open(ERROR_LOG_PATH, 'a') as f:
            f.write(f"\n--- Error Log {datetime.now().isoformat()} ---\n")
            for error in self.log_errors:
                f.write(f"{error}\n")


def export_orders_to_ecotrack(orders, template_path=None, output_path=None):
    """
    Export orders to an EcoTrack Excel file using their template.
    
    Args:
        orders: List of order objects with customer and item details
        template_path: Path to the EcoTrack template file. If None, uses the default path.
        output_path: Path to save the Excel file. If None, a default path is used.
    
    Returns:
        Path to the saved Excel file
    """
    exporter = EcoTrackExcelExporter(template_path)
    return exporter.export_orders(orders, output_path)


# If run directly, perform test export from JSON
if __name__ == "__main__":
    import sys
    
    # Check if args provided
    if len(sys.argv) > 1:
        orders_json_path = sys.argv[1]
        template_path = sys.argv[2] if len(sys.argv) > 2 else None
        output_path = sys.argv[3] if len(sys.argv) > 3 else None
        
        # Load orders from JSON
        with open(orders_json_path, 'r') as f:
            orders = json.load(f)
        
        # Export to Excel
        result_path = export_orders_to_ecotrack(orders, template_path, output_path)
        print(result_path)
    else:
        print("Usage: python ecotrack_excel_export.py orders_json_path [template_path] [output_path]")
        sys.exit(1)