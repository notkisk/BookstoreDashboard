import { Wilaya, Commune } from './process-algeria-data';
import algeriaDataFile from './algeria_location_data.json';

// Define the types for our data
interface LocationData {
  wilayas: { id: string; name: string }[];
  communes: { id: string; name: string; wilayaId: string }[];
}

// Import our complete location data
const algeriaLocationData: LocationData = algeriaDataFile as LocationData;

// Pre-populated lists of wilayas and communes
export const wilayas: Wilaya[] = algeriaLocationData.wilayas.map(wilaya => ({
  id: wilaya.id,
  name: wilaya.name
}));

export const communes: Commune[] = algeriaLocationData.communes.map(commune => ({
  id: commune.id,
  name: commune.name,
  wilayaId: commune.wilayaId
}));

// Helper functions using the populated data
export const getCommunesByWilayaId = (wilayaId: string): Commune[] => {
  return communes.filter(commune => commune.wilayaId === wilayaId);
};

export const getWilayaById = (wilayaId: string): Wilaya | undefined => {
  return wilayas.find(wilaya => wilaya.id === wilayaId);
};

export const getCommuneById = (communeId: string): Commune | undefined => {
  return communes.find(commune => commune.id === communeId);
};

// Check if location data is available - should always be true now
export const isLocationDataAvailable = (): boolean => {
  return wilayas.length > 0 && communes.length > 0;
};

// Function to update the data - kept for backward compatibility
export const updateLocationData = (newWilayas: Wilaya[], newCommunes: Commune[]) => {
  // Clear existing arrays
  wilayas.length = 0;
  communes.length = 0;
  
  // Add new data
  wilayas.push(...newWilayas);
  communes.push(...newCommunes);
};