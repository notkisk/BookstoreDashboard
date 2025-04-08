import re
import json
import os

# Path to the plain text file with communes and wilayas
txt_file_path = 'attached_assets/Pasted-Adrar-1-Akabli-1-Aoulef-1-Bouda-1-Fenoughil-1-In-Zghmir-1-Ouled-Ahmed-Timmi-1-Reggane-1-Sali-1-Sebaa-1744074633267.txt'

# Path to the existing location data JSON file
location_data_path = 'client/src/data/algeria_location_data.json'

# Function to parse the text file
def parse_communes_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Regular expression pattern to match commune and wilaya code
    # Pattern: commune name followed by wilaya code, separated by spaces
    pattern = r'([A-Za-z\']+(?:\s+[A-Za-z\']+)*)\s+(\d+)'
    matches = re.findall(pattern, content)
    
    print(f"Found {len(matches)} raw matches in the text file")
    
    # Organize communes by wilaya code
    communes_by_wilaya = {}
    for match in matches:
        commune_name = match[0].strip()
        wilaya_code = match[1].strip()
        
        if wilaya_code not in communes_by_wilaya:
            communes_by_wilaya[wilaya_code] = []
        
        communes_by_wilaya[wilaya_code].append(commune_name)
    
    return communes_by_wilaya

# Function to load the existing location data
def load_location_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        return data
    except Exception as e:
        print(f"Error loading location data: {e}")
        return {"wilayas": [], "communes": []}

# Function to update commune names with the corrected ones
def update_location_data(location_data, communes_by_wilaya):
    # Create a dictionary mapping between commune ID and its wilaya ID
    commune_to_wilaya_map = {c["id"]: c["wilayaId"] for c in location_data["communes"]}
    
    # Create a list of commune IDs by wilaya
    communes_by_wilaya_id = {}
    for commune in location_data["communes"]:
        wilaya_id = commune["wilayaId"]
        if wilaya_id not in communes_by_wilaya_id:
            communes_by_wilaya_id[wilaya_id] = []
        communes_by_wilaya_id[wilaya_id].append(commune["id"])
    
    # Check for communes that need fixing
    fixes_made = 0
    for wilaya_id, commune_ids in communes_by_wilaya_id.items():
        if wilaya_id in communes_by_wilaya:
            correct_communes = communes_by_wilaya[wilaya_id]
            
            # If we have the same number of communes, assume we can directly map them
            if len(commune_ids) == len(correct_communes):
                for i, commune_id in enumerate(sorted(commune_ids)):
                    for commune in location_data["communes"]:
                        if commune["id"] == commune_id:
                            old_name = commune["name"]
                            new_name = correct_communes[i]
                            if old_name != new_name:
                                print(f"Updating commune: {old_name} -> {new_name} (Wilaya {wilaya_id})")
                                commune["name"] = new_name
                                fixes_made += 1
    
    print(f"\nTotal fixes made: {fixes_made}")
    return location_data

# Output the updated data to a new JSON file
def save_updated_data(data, output_path):
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

# Main execution
try:
    print("Parsing communes text file...")
    communes_by_wilaya = parse_communes_file(txt_file_path)
    
    print(f"Found {sum(len(communes) for communes in communes_by_wilaya.values())} communes across {len(communes_by_wilaya)} wilayas")
    
    print("Loading existing location data...")
    location_data = load_location_data(location_data_path)
    
    print(f"Loaded {len(location_data['communes'])} communes and {len(location_data['wilayas'])} wilayas from existing data")
    
    print("Updating commune names...")
    updated_data = update_location_data(location_data, communes_by_wilaya)
    
    # Save to a new file
    output_path = 'client/src/data/updated_algeria_location_data.json'
    save_updated_data(updated_data, output_path)
    print(f"Updated data saved to {output_path}")
    
except Exception as e:
    print(f"Error: {e}")