import re
import json

# Algerian wilayas mapping (code to name)
wilaya_names = {
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
    "34": "Bordj Bou Arréridj",
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
    "52": "Bordj Baji Mokhtar",
    "53": "Béni Abbès",
    "54": "Timimoun",
    "55": "Touggourt",
    "56": "Djanet",
    "57": "In Salah", 
    "58": "In Guezzam"
}

# Parse the data file
with open('attached_assets/Pasted-Adrar-1-Akabli-1-Aoulef-1-Bouda-1-Fenoughil-1-In-Zghmir-1-Ouled-Ahmed-Timmi-1-Reggane-1-Sali-1-Sebaa-1744074633267.txt', 'r') as f:
    text = f.read()
    
    # Extract commune and wilaya code pairs
    pairs = re.findall(r'(\S+)\s+(\d+)', text)
    
    # Format data structure for wilayas
    wilayas = [{"id": code, "name": wilaya_names[code]} for code in sorted(wilaya_names.keys())]
    
    # Group communes by wilaya
    communes = []
    for commune, wilaya_code in pairs:
        communes.append({
            "id": f"{commune}_{wilaya_code}",
            "name": commune,
            "wilayaId": wilaya_code
        })
    
    # Output JSON
    output = {
        "wilayas": wilayas,
        "communes": communes
    }
    
    with open('algeria_location_data.json', 'w') as out_file:
        json.dump(output, out_file, indent=2)
    
    print(f"Generated data with {len(wilayas)} wilayas and {len(communes)} communes")
    print("JSON file saved as algeria_location_data.json")