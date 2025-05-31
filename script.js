const gallery = document.getElementById("gallery");

const customTitles = {
  "dex.txt": "DEX",
  "climatedesignstudio.txt": "Water",
  "masterslave.txt": "DEX – Master / Slave",
  "a-shopping-plague.txt": "A Shopping Plague",
  "earlierworks.txt": "works",
  "paradegame.txt": "INDA_PARADE_game#1",
  "archigrad.txt": "archigrad",
  "a-shopping-plague-thesis.txt": "A Shopping Plague Genk",
  "masterplan.txt": "Masterplan Competition Belgium"
};

let fullTree = [];
let currentStack = [];

fetch("files.json")
  .then(res => res.json())
  .then(data => {
    fullTree = data;
    renderGallery(data, []);
  })
  .catch(err => console.error("Failed to load files.json", err));

function renderGallery(currentLevel, stack) {
  gallery.innerHTML = "";
  currentStack = stack;
  const currentFolder = stack[stack.length - 1] || null;

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

  if (currentFolder) {
    renderImages(currentFolder);
    renderVideos(currentFolder);
    renderPDFs(currentFolder);
    renderEmbeds(currentFolder);
  }

  addOrRemoveBackButton(stack);
}

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
    const card = document.createElement("div");
    card.className = "project-card";
    fetch(`projects/${folder.path}/${txtFile}`)
      .then(res => res.text())
      .then(embed => {
        const title = customTitles[txtFile.toLowerCase()] || txtFile.replace(".txt", "");
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


const overlayPrev = document.getElementById("overlayPrev");
const overlayNext = document.getElementById("overlayNext");

let overlayImages = [];
let overlayCurrentIndex = 0;

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

// Only close when clicking on dark background, not on image or arrows
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
