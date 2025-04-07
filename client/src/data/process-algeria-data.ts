import * as XLSX from 'xlsx';

export interface Wilaya {
  id: string;
  name: string;
}

export interface Commune {
  id: string;
  name: string;
  wilayaId: string;
}

/**
 * Process the Algeria location data from an Excel file
 * The file format is expected to be: "nom communes code wilayas"
 * Each row contains: [commune name] [wilaya code]
 */
export async function processAlgeriaData(filePath: string): Promise<{
  wilayas: Wilaya[];
  communes: Commune[];
}> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

    // Skip header row if present
    const dataRows = rawData[0][0]?.toLowerCase().includes('commune') ? rawData.slice(1) : rawData;
    
    // Process the data
    const wilayasMap = new Map<string, string>();
    const communesMap = new Map<string, { name: string; wilayaId: string }>();
    
    // Extract wilayas and communes
    for (const row of dataRows) {
      if (!row || row.length < 2) continue;
      
      // The last item is the wilaya code
      const communeName = row[0]?.toString().trim();
      const wilayaCode = row[1]?.toString().trim();
      
      if (!communeName || !wilayaCode) continue;
      
      // Add wilaya if we don't have it yet
      if (!wilayasMap.has(wilayaCode)) {
        // We don't have actual wilaya names in this file format, 
        // just generate a placeholder name from wilaya code
        const wilayaName = getWilayaName(wilayaCode);
        wilayasMap.set(wilayaCode, wilayaName);
      }
      
      // Generate a unique ID for the commune
      const communeId = `${communeName.toLowerCase().replace(/\s+/g, '-')}-${wilayaCode}`;
      communesMap.set(communeId, { name: communeName, wilayaId: wilayaCode });
    }
    
    // Convert maps to arrays
    const wilayas: Wilaya[] = Array.from(wilayasMap).map(([id, name]) => ({ id, name }));
    const communes: Commune[] = Array.from(communesMap).map(([id, commune]) => ({
      id,
      name: commune.name,
      wilayaId: commune.wilayaId
    }));
    
    // Sort by ID
    wilayas.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    communes.sort((a, b) => {
      const wilayaCompare = parseInt(a.wilayaId) - parseInt(b.wilayaId);
      if (wilayaCompare !== 0) return wilayaCompare;
      return a.name.localeCompare(b.name);
    });
    
    return { wilayas, communes };
  } catch (error) {
    console.error('Error processing Algeria data:', error);
    throw new Error('Failed to process Algeria location data');
  }
}

/**
 * Get a formatted wilaya name from its code
 */
function getWilayaName(id: string): string {
  // Predefined wilaya names if we have them
  const wilayaNames: Record<string, string> = {
    "1": "Adrar",
    "2": "Chlef",
    "3": "Laghouat",
    "4": "Oum El Bouaghi",
    "5": "Batna",
    "6": "Béjaïa",
    "7": "Biskra",
    "8": "Béchar",
    "9": "Blida",
    "10": "Bouira",
    "11": "Tamanrasset",
    "12": "Tébessa",
    "13": "Tlemcen",
    "14": "Tiaret",
    "15": "Tizi Ouzou",
    "16": "Alger",
    "17": "Djelfa",
    "18": "Jijel",
    "19": "Sétif",
    "20": "Saïda",
    "21": "Skikda",
    "22": "Sidi Bel Abbès",
    "23": "Annaba",
    "24": "Guelma",
    "25": "Constantine",
    "26": "Médéa",
    "27": "Mostaganem",
    "28": "M'Sila",
    "29": "Mascara",
    "30": "Ouargla",
    "31": "Oran",
    "32": "El Bayadh",
    "33": "Illizi",
    "34": "Bordj Bou Arreridj",
    "35": "Boumerdès",
    "36": "El Tarf",
    "37": "Tindouf",
    "38": "Tissemsilt",
    "39": "El Oued",
    "40": "Khenchela",
    "41": "Souk Ahras",
    "42": "Tipaza",
    "43": "Mila",
    "44": "Aïn Defla",
    "45": "Naâma",
    "46": "Aïn Témouchent",
    "47": "Ghardaïa",
    "48": "Relizane",
    "49": "El M'Ghair",
    "50": "El Meniaa",
    "51": "Ouled Djellal",
    "52": "Bordj Badji Mokhtar",
    "53": "Béni Abbès",
    "54": "Timimoun",
    "55": "Touggourt",
    "56": "Djanet",
    "57": "In Salah",
    "58": "In Guezzam"
  };

  // Return the known name or a default
  return wilayaNames[id] || `Wilaya-${id}`;
}

// Helper functions for use in the application
export const getCommunesByWilayaId = (wilayaId: string, communes: Commune[]): Commune[] => {
  return communes.filter(commune => commune.wilayaId === wilayaId);
};

export const getWilayaById = (wilayaId: string, wilayas: Wilaya[]): Wilaya | undefined => {
  return wilayas.find(wilaya => wilaya.id === wilayaId);
};

export const getCommuneById = (communeId: string, communes: Commune[]): Commune | undefined => {
  return communes.find(commune => commune.id === communeId);
};