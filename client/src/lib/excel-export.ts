import * as XLSX from 'xlsx';

// Column mappings for the template
const EXCEL_COLUMN_MAP = {
  'reference': 'B', // reference commande
  'name': 'C',      // nom et prénom du destinataire
  'phone': 'D',     // telephone
  'phone2': 'E',    // telephone 2
  'wilayaCode': 'F', // code wilaya
  'wilaya': 'G',    // wilaya de livraison
  'commune': 'H',   // commune de livraison
  'address': 'I',   // adresse de livraison
  'product': 'J',   // produit
  'weight': 'K',    // poids(kg)
  'amount': 'L',    // montant du colis
  'remarks': 'M',   // remarque
  'fragile': 'N',   // FRAGILE
  'echange': 'O',   // ECHANGE
  'pickup': 'P',    // PICK UP
  'recouvrement': 'Q', // RECOUVREMENT
  'stopDesk': 'R',  // STOP DESK
  'mapLink': 'S',   // Lien map
};

// Data row where we start inserting order data (in 1-indexed format)
const START_ROW = 12;

interface OrderExportData {
  reference: string;
  name: string;
  phone: string;
  phone2?: string;
  wilayaCode: string;
  wilaya: string;
  commune: string;
  address: string;
  product: string;
  weight?: string;
  amount: number;
  remarks?: string;
  fragile: boolean;
  echange: boolean;
  pickup: boolean;
  recouvrement: boolean;
  stopDesk: boolean;
  mapLink?: string;
}

/**
 * Generate an Excel file from the given order data using the template
 * @param orders The order data to include in the export
 * @param filename The name of the file to download
 */
export async function generateExcelFromTemplate(orders: OrderExportData[], filename: string = 'orders_export.xlsx'): Promise<void> {
  try {
    // Fetch the template file
    const response = await fetch('/templates/order_export_template.xlsx');
    const templateArrayBuffer = await response.arrayBuffer();
    
    // Load the template workbook
    const workbook = XLSX.read(templateArrayBuffer, { type: 'array' });
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Add data to the worksheet
    orders.forEach((order, index) => {
      const rowIndex = START_ROW + index;
      
      // Set each cell value using the column mapping
      // Reference column
      worksheet[`${EXCEL_COLUMN_MAP.reference}${rowIndex}`] = { t: 's', v: order.reference };
      
      // Customer name
      worksheet[`${EXCEL_COLUMN_MAP.name}${rowIndex}`] = { t: 's', v: order.name };
      
      // Phone - ensure it's treated as text
      worksheet[`${EXCEL_COLUMN_MAP.phone}${rowIndex}`] = { t: 's', v: `'${order.phone}` };
      
      // Phone 2 - optional
      if (order.phone2) {
        worksheet[`${EXCEL_COLUMN_MAP.phone2}${rowIndex}`] = { t: 's', v: `'${order.phone2}` };
      }
      
      // Wilaya code
      worksheet[`${EXCEL_COLUMN_MAP.wilayaCode}${rowIndex}`] = { t: 's', v: order.wilayaCode };
      
      // Wilaya name
      worksheet[`${EXCEL_COLUMN_MAP.wilaya}${rowIndex}`] = { t: 's', v: order.wilaya };
      
      // Commune name
      worksheet[`${EXCEL_COLUMN_MAP.commune}${rowIndex}`] = { t: 's', v: order.commune };
      
      // Address
      worksheet[`${EXCEL_COLUMN_MAP.address}${rowIndex}`] = { t: 's', v: order.address };
      
      // Product
      worksheet[`${EXCEL_COLUMN_MAP.product}${rowIndex}`] = { t: 's', v: order.product };
      
      // Weight (optional)
      if (order.weight) {
        worksheet[`${EXCEL_COLUMN_MAP.weight}${rowIndex}`] = { t: 's', v: order.weight };
      }
      
      // Amount
      worksheet[`${EXCEL_COLUMN_MAP.amount}${rowIndex}`] = { t: 'n', v: order.amount };
      
      // Remarks (optional)
      if (order.remarks) {
        worksheet[`${EXCEL_COLUMN_MAP.remarks}${rowIndex}`] = { t: 's', v: order.remarks };
      }
      
      // Special flags - only add OUI if true
      if (order.fragile) {
        worksheet[`${EXCEL_COLUMN_MAP.fragile}${rowIndex}`] = { t: 's', v: 'OUI' };
      }
      
      if (order.echange) {
        worksheet[`${EXCEL_COLUMN_MAP.echange}${rowIndex}`] = { t: 's', v: 'OUI' };
      }
      
      if (order.pickup) {
        worksheet[`${EXCEL_COLUMN_MAP.pickup}${rowIndex}`] = { t: 's', v: 'OUI' };
      }
      
      if (order.recouvrement) {
        worksheet[`${EXCEL_COLUMN_MAP.recouvrement}${rowIndex}`] = { t: 's', v: 'OUI' };
      }
      
      if (order.stopDesk) {
        worksheet[`${EXCEL_COLUMN_MAP.stopDesk}${rowIndex}`] = { t: 's', v: 'OUI' };
      }
      
      // Map link (optional)
      if (order.mapLink) {
        worksheet[`${EXCEL_COLUMN_MAP.mapLink}${rowIndex}`] = { t: 's', v: order.mapLink };
      }
    });
    
    // Generate and download the file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error generating Excel file:', error);
    throw error;
  }
}