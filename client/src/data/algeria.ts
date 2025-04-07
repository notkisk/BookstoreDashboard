export interface Wilaya {
  id: string;
  name: string;
}

export interface Commune {
  id: string;
  name: string;
  wilayaId: string;
}

// List of Algerian wilayas (numbered 01-58)
export const wilayas: Wilaya[] = [
  { id: "01", name: "Adrar" },
  { id: "02", name: "Chlef" },
  { id: "03", name: "Laghouat" },
  { id: "04", name: "Oum El Bouaghi" },
  { id: "05", name: "Batna" },
  { id: "06", name: "Béjaïa" },
  { id: "07", name: "Biskra" },
  { id: "08", name: "Béchar" },
  { id: "09", name: "Blida" },
  { id: "10", name: "Bouira" },
  { id: "11", name: "Tamanrasset" },
  { id: "12", name: "Tébessa" },
  { id: "13", name: "Tlemcen" },
  { id: "14", name: "Tiaret" },
  { id: "15", name: "Tizi Ouzou" },
  { id: "16", name: "Alger" },
  { id: "17", name: "Djelfa" },
  { id: "18", name: "Jijel" },
  { id: "19", name: "Sétif" },
  { id: "20", name: "Saïda" },
  { id: "21", name: "Skikda" },
  { id: "22", name: "Sidi Bel Abbès" },
  { id: "23", name: "Annaba" },
  { id: "24", name: "Guelma" },
  { id: "25", name: "Constantine" },
  { id: "26", name: "Médéa" },
  { id: "27", name: "Mostaganem" },
  { id: "28", name: "M'Sila" },
  { id: "29", name: "Mascara" },
  { id: "30", name: "Ouargla" },
  { id: "31", name: "Oran" },
  { id: "32", name: "El Bayadh" },
  { id: "33", name: "Illizi" },
  { id: "34", name: "Bordj Bou Arreridj" },
  { id: "35", name: "Boumerdès" },
  { id: "36", name: "El Tarf" },
  { id: "37", name: "Tindouf" },
  { id: "38", name: "Tissemsilt" },
  { id: "39", name: "El Oued" },
  { id: "40", name: "Khenchela" },
  { id: "41", name: "Souk Ahras" },
  { id: "42", name: "Tipaza" },
  { id: "43", name: "Mila" },
  { id: "44", name: "Aïn Defla" },
  { id: "45", name: "Naâma" },
  { id: "46", name: "Aïn Témouchent" },
  { id: "47", name: "Ghardaïa" },
  { id: "48", name: "Relizane" },
  { id: "49", name: "El M'Ghair" },
  { id: "50", name: "El Meniaa" },
  { id: "51", name: "Ouled Djellal" },
  { id: "52", name: "Bordj Baji Mokhtar" },
  { id: "53", name: "Béni Abbès" },
  { id: "54", name: "Timimoun" },
  { id: "55", name: "Touggourt" },
  { id: "56", name: "Djanet" },
  { id: "57", name: "In Salah" },
  { id: "58", name: "In Guezzam" }
];

// Sample communes for major wilayas
// In a real implementation, you would include all communes for each wilaya
export const communes: Commune[] = [
  // Adrar (01)
  { id: "0101", name: "Adrar", wilayaId: "01" },
  { id: "0102", name: "Reggane", wilayaId: "01" },
  { id: "0103", name: "Timimoun", wilayaId: "01" },
  
  // Chlef (02)
  { id: "0201", name: "Chlef", wilayaId: "02" },
  { id: "0202", name: "Ténès", wilayaId: "02" },
  { id: "0203", name: "Boukadir", wilayaId: "02" },
  
  // Laghouat (03)
  { id: "0301", name: "Laghouat", wilayaId: "03" },
  { id: "0302", name: "Aflou", wilayaId: "03" },
  
  // Alger (16)
  { id: "1601", name: "Alger Centre", wilayaId: "16" },
  { id: "1602", name: "Bab El Oued", wilayaId: "16" },
  { id: "1603", name: "Bir Mourad Raïs", wilayaId: "16" },
  { id: "1604", name: "Bouzareah", wilayaId: "16" },
  { id: "1605", name: "El Harrach", wilayaId: "16" },
  { id: "1606", name: "Dar El Beïda", wilayaId: "16" },
  
  // Oran (31)
  { id: "3101", name: "Oran", wilayaId: "31" },
  { id: "3102", name: "Aïn El Turk", wilayaId: "31" },
  { id: "3103", name: "Es Senia", wilayaId: "31" },
  { id: "3104", name: "Arzew", wilayaId: "31" },
  
  // Constantine (25)
  { id: "2501", name: "Constantine", wilayaId: "25" },
  { id: "2502", name: "El Khroub", wilayaId: "25" },
  { id: "2503", name: "Hamma Bouziane", wilayaId: "25" }
];

// Function to get communes for a specific wilaya
export const getCommunesByWilayaId = (wilayaId: string): Commune[] => {
  return communes.filter(commune => commune.wilayaId === wilayaId);
};

// Function to get wilaya by ID
export const getWilayaById = (wilayaId: string): Wilaya | undefined => {
  return wilayas.find(wilaya => wilaya.id === wilayaId);
};

// Function to get commune by ID
export const getCommuneById = (communeId: string): Commune | undefined => {
  return communes.find(commune => commune.id === communeId);
};
