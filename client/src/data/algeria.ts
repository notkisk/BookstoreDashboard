import { Wilaya, Commune } from './process-algeria-data';

// These will be populated by the data upload process
export const wilayas: Wilaya[] = [];
export const communes: Commune[] = [];

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

// Check if location data is available
export const isLocationDataAvailable = (): boolean => {
  return wilayas.length > 0 && communes.length > 0;
};

// Function to update the data
export const updateLocationData = (newWilayas: Wilaya[], newCommunes: Commune[]) => {
  // Clear existing arrays
  wilayas.length = 0;
  communes.length = 0;
  
  // Add new data
  wilayas.push(...newWilayas);
  communes.push(...newCommunes);
};