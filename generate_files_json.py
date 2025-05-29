import os
import json

# Define supported file types
VALID_IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif')
VALID_VIDEO_EXTS = ('.mp4',)
VALID_PDF_EXTS = ('.pdf',)
VALID_EMBED_EXTS = ('.txt',)

PROJECTS_DIR = "projects"

def build_tree(path):
    """Recursively build a JSON structure for all folders and media types."""
    node = {
        "name": os.path.basename(path),
        "path": os.path.relpath(path, PROJECTS_DIR).replace("\\", "/"),
        "type": "folder",
        "images": [],
        "videos": [],
        "pdfs": [],
        "embeds": [],
        "children": []
    }

    for item in sorted(os.listdir(path)):
        full_path = os.path.join(path, item)
        if os.path.isdir(full_path):
            node["children"].append(build_tree(full_path))
        else:
            ext = os.path.splitext(item)[1].lower()
            if ext in VALID_IMAGE_EXTS:
                node["images"].append(item)
            elif ext in VALID_VIDEO_EXTS:
                node["videos"].append(item)
            elif ext in VALID_PDF_EXTS:
                node["pdfs"].append(item)
            elif ext in VALID_EMBED_EXTS:
                node["embeds"].append(item)

    return node

# Build the full tree starting from the root "projects" directory
tree = []
if os.path.exists(PROJECTS_DIR):
    for item in os.listdir(PROJECTS_DIR):
        full = os.path.join(PROJECTS_DIR, item)
        if os.path.isdir(full):
            tree.append(build_tree(full))

# Save to files.json
output_path = "files.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(tree, f, indent=2)

output_path
