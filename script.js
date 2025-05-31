const gallery = document.getElementById("gallery");

let fullTree = [];
let currentStack = [];

let overlayImages = [];
let overlayCurrentIndex = 0;

fetch("files.json")
  .then(res => res.json())
  .then(data => {
    fullTree = data;
    renderGallery(data, []);
  })
  .catch(err => console.error("Failed to load files.json", err));

// ======== MAIN GALLERY RENDERING ========

function renderGallery(currentLevel, stack) {
  gallery.innerHTML = "";
  currentStack = stack;
  const currentFolder = stack[stack.length - 1] || null;

  // ----- About Section -----
  const folderAboutDiv = document.getElementById('folderAbout');
  folderAboutDiv.innerHTML = "";
  let aboutFile = null;
  if (currentFolder && currentFolder.embeds) {
    if (currentFolder.embeds.includes("about.txt")) {
      aboutFile = "about.txt";
    } else if (currentFolder.embeds.includes("about.docx")) {
      aboutFile = "about.docx";
    }
  }
  if (aboutFile) {
    if (aboutFile.endsWith(".txt")) {
      fetch(`projects/${currentFolder.path}/${aboutFile}`)
        .then(res => res.text())
        .then(text => {
          folderAboutDiv.innerHTML = `<div class="folder-about-content">${text.trim()}</div>`;
        })
        .catch(() => {
          folderAboutDiv.innerHTML = `<div class="folder-about-content">[${aboutFile} could not be loaded]</div>`;
        });
    } else if (aboutFile.endsWith(".docx")) {
      fetch(`projects/${currentFolder.path}/${aboutFile}`)
        .then(response => response.blob())
        .then(blob => mammoth.convertToHtml({arrayBuffer: blob}))
        .then(result => {
          folderAboutDiv.innerHTML = `<div class="folder-about-content">${result.value}</div>`;
        })
        .catch(() => {
          folderAboutDiv.innerHTML = `<div class="folder-about-content">[${aboutFile} could not be loaded]</div>`;
        });
    }
  }

  // ----- Folders -----
  currentLevel.forEach(node => {
    if (node.type === "folder") {
      const previewImage = getRandomImage(node);
      const card = document.createElement("div");
      card.className = "project-card-wrapper";
      card.innerHTML = `
        <div class="project-card">
          ${previewImage ? `<img src="projects/${node.path}/${previewImage}" alt="${node.name}">` : ""}
          <h3>${node.name.replace(/[-_]/g, " ")}</h3>
        </div>
      `;
      card.addEventListener("click", () => {
        renderGallery(node.children || [], [...stack, node]);
      });
      gallery.appendChild(card);
    }
  });

  // ----- Files (Images, Videos, PDFs, Embeds) -----
  if (currentFolder) {
    renderImages(currentFolder);
    renderVideos(currentFolder);
    renderPDFs(currentFolder);
    renderEmbeds(currentFolder);
  }

  addOrRemoveBackButton(stack);
}

// ======== FILE RENDERERS ========

function renderImages(folder) {
  const imageList = (folder.images || []).map(img => `projects/${folder.path}/${img}`);
  (folder.images || []).forEach((img, i) => {
    const card = document.createElement("div");
    card.className = "project-card";
    const src = `projects/${folder.path}/${img}`;
    card.innerHTML = `<img src="${src}" alt="${img}">`;
    card.onclick = () => showImageModal(src, img, imageList, i);
    gallery.appendChild(card);
  });
}

function renderVideos(folder) {
  folder.videos?.forEach(video => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <video controls width="100%" height="100%">
        <source src="projects/${folder.path}/${video}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
    gallery.appendChild(card);
  });
}

function renderPDFs(folder) {
  folder.pdfs?.forEach(pdf => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <a href="projects/${folder.path}/${pdf}" target="_blank" style="color: white;">
        📄 ${pdf}
      </a>
    `;
    gallery.appendChild(card);
  });
}

function renderEmbeds(folder) {
  folder.embeds?.forEach(txtFile => {
    // Skip about.txt/about.docx here (handled above)
    if (txtFile.toLowerCase() === "about.txt" || txtFile.toLowerCase() === "about.docx") return;

    const card = document.createElement("div");
    card.className = "project-card";
    fetch(`projects/${folder.path}/${txtFile}`)
      .then(res => res.text())
      .then(embed => {
        const title = txtFile.replace(/\.txt$/i, "").replace(/[-_]/g, " ");
        card.innerHTML = `
          <div class="embed-wrapper">${embed}</div>
          <h3>${title}</h3>
        `;
        gallery.appendChild(card);
      })
      .catch(() => {
        card.innerHTML = `<p>❌ Could not load ${txtFile}</p>`;
        gallery.appendChild(card);
      });
  });
}

// ======== UTILITIES ========

function getRandomImage(folder) {
  if (folder.images?.length > 0) {
    return folder.images[Math.floor(Math.random() * folder.images.length)];
  }
  for (const child of folder.children || []) {
    const childImage = getRandomImage(child);
    if (childImage) return `${child.name}/${childImage}`;
  }
  return null;
}

function addOrRemoveBackButton(stack) {
  const id = "back-btn-wrapper";
  const existing = document.getElementById(id);

  if (stack.length > 0) {
    if (!existing) {
      const btnWrapper = document.createElement("div");
      btnWrapper.id = id;
      btnWrapper.style.cssText = `
        position: fixed;
        top: 24px;
        left: 24px;
        z-index: 1000;
      `;
      btnWrapper.innerHTML = `
        <button id="back-btn" title="Back"
          style="
            font-size: 1.8rem;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
          ">◀</button>`;
      document.body.appendChild(btnWrapper);
      document.getElementById("back-btn").addEventListener("click", () => {
        const newStack = [...stack];
        newStack.pop();
        const parent = resolveNode(fullTree, newStack);
        renderGallery(parent?.children || fullTree, newStack);
      });
    }
  } else {
    if (existing) existing.remove();
  }
}

function resolveNode(nodes, pathStack) {
  let current = null;
  let list = nodes;
  for (let node of pathStack) {
    current = list.find(n => n.name === node.name && n.path === node.path);
    if (!current) return null;
    list = current.children;
  }
  return current;
}

// ======== IMAGE OVERLAY LOGIC ========

const imageOverlay = document.getElementById("imageOverlay");
const overlayImg = document.getElementById("overlayImg");
const overlayPrev = document.getElementById("overlayPrev");
const overlayNext = document.getElementById("overlayNext");

function showImageModal(src, alt, imageList, currentIndex) {
  overlayImages = imageList || [src];
  overlayCurrentIndex = (typeof currentIndex === 'number') ? currentIndex : 0;
  overlayImg.src = overlayImages[overlayCurrentIndex];
  overlayImg.alt = alt || '';
  imageOverlay.style.display = "flex";
  updateOverlayNav();
}

function updateOverlayNav() {
  overlayPrev.style.display = (overlayCurrentIndex > 0) ? "" : "none";
  overlayNext.style.display = (overlayCurrentIndex < overlayImages.length - 1) ? "" : "none";
}

overlayPrev.onclick = function(e) {
  e.stopPropagation();
  if (overlayCurrentIndex > 0) {
    overlayCurrentIndex--;
    overlayImg.src = overlayImages[overlayCurrentIndex];
    updateOverlayNav();
  }
};
overlayNext.onclick = function(e) {
  e.stopPropagation();
  if (overlayCurrentIndex < overlayImages.length - 1) {
    overlayCurrentIndex++;
    overlayImg.src = overlayImages[overlayCurrentIndex];
    updateOverlayNav();
  }
};
imageOverlay.onclick = function(e) {
  if (e.target === imageOverlay) {
    imageOverlay.style.display = "none";
    overlayImg.src = '';
    overlayImages = [];
  }
};
// Keyboard navigation
window.addEventListener("keydown", function(e) {
  if (imageOverlay.style.display === "flex") {
    if (e.key === "ArrowLeft" && overlayPrev.style.display !== "none") overlayPrev.onclick(e);
    if (e.key === "ArrowRight" && overlayNext.style.display !== "none") overlayNext.onclick(e);
    if (e.key === "Escape") imageOverlay.onclick({target:imageOverlay});
  }
});
