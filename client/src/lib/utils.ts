import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge tailwind classes while handling conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a number as currency (DA - Algerian Dinar)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-DZ', { 
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(amount) + ' DA';
}

// Format a date to a readable string
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Generate a CSV download link from data
export function generateCSV(data: any[], filename: string = 'export.csv'): void {
  if (!data || !data.length) {
    return;
  }
  
  const headers = Object.keys(data[0]);
  
  // Add BOM to ensure Excel properly handles UTF-8 characters (especially Arabic)
  const BOM = '\uFEFF';
  
  // Convert data to CSV
  const csvContent = BOM + [
    // Add headers
    headers.join(';'), // Using semicolon separator for better Excel compatibility
    // Add rows
    ...data.map(row => 
      headers.map(header => {
        // Handle values that need quotes
        const value = row[header];
        const cellValue = value === null || value === undefined ? '' : String(value);
        
        // Properly escape values - especially for Excel compatibility
        if (cellValue.includes(';') || cellValue.includes('\n') || cellValue.includes('"')) {
          return `"${cellValue.replace(/"/g, '""')}"`;
        }
        return cellValue;
      }).join(';')
    )
  ].join('\r\n'); // CRLF line breaks for better Excel compatibility
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Function to return status badge color based on status
export function getStatusColor(status: string): { bg: string, text: string } {
  switch (status.toLowerCase()) {
    case 'delivered':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'processing':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'pending':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'cancelled':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
}

// Create a slugified ID from a string
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
}

// Generate a random reference number
export function generateReference(prefix: string = 'ORD'): string {
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
}
