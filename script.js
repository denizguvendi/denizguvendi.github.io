const gallery = document.getElementById("gallery");

let fullTree = [];
let currentStack = [];
let allProjects = [];

let overlayImages = [];
let overlayCurrentIndex = 0;

fetch("files.json")
  .then(res => res.json())
  .then(data => {
    fullTree = data;
    
    // Collect all projects for image pool
    function collectAllProjects(nodes) {
      nodes.forEach(node => {
        if (node.type === "folder") {
          allProjects.push(node);
          if (node.children) collectAllProjects(node.children);
        }
      });
    }
    collectAllProjects(data);
    
    // Show main page with folders + images
    renderMainPage();
  })
  .catch(err => console.error("Failed to load files.json", err));

// ======== MAIN PAGE - FOLDERS + IMAGES ========

function renderMainPage() {
  gallery.innerHTML = "";
  gallery.classList.remove("gallery-sub-1", "gallery-sub-2");
  gallery.classList.add("gallery-main");
  currentStack = [];

  // Get all top-level folders (first 8 grids)
  const topFolders = fullTree.filter(f => f.type === "folder");

  // Render folders first
  topFolders.forEach(folder => {
    const previewImage = getRandomImage(folder);
    const card = document.createElement("div");
    card.className = "project-card-wrapper";
    card.innerHTML = `
      <div class="project-card">
        ${previewImage ? `<img src="projects/${folder.path}/${previewImage}" alt="${folder.name}">` : ""}
        <h3>${folder.name.replace(/[-_]/g, " ")}</h3>
      </div>
    `;
    card.addEventListener("click", () => {
      renderGallery(folder.children || [], [folder]);
    });
    gallery.appendChild(card);
  });

  // Collect all images from all projects and shuffle them
  const allCards = [];
  allProjects.forEach(project => {
    (project.images || []).forEach((img, i) => {
      const src = `projects/${project.path}/${img}`;
      const imageList = (project.images || []).map(image => `projects/${project.path}/${image}`);
      allCards.push({
        src,
        img,
        imageList,
        index: i
      });
    });
  });

  // Shuffle images
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }

  // Render shuffled images after folders
  allCards.forEach(cardData => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <img src="${cardData.src}" alt="${cardData.img}">
      <h3>${cardData.img}</h3>
    `;
    card.onclick = () => showImageModal(cardData.src, cardData.img, cardData.imageList, cardData.index);
    gallery.appendChild(card);
  });

  addOrRemoveBackButton([]);
}

// ======== SUBFOLDER GALLERY ========

function renderGallery(currentLevel, stack) {
  gallery.innerHTML = "";
  gallery.classList.remove("gallery-main", "gallery-sub-1", "gallery-sub-2");
  
  // Determine depth and apply appropriate class
  const depth = stack.length;
  if (depth === 1) {
    gallery.classList.add("gallery-sub-1");
  } else if (depth >= 2) {
    gallery.classList.add("gallery-sub-2");
  }
  
  currentStack = stack;
  const currentFolder = stack[stack.length - 1] || null;

  // About section - only show on main page
  const folderAboutDiv = document.getElementById('folderAbout');
  folderAboutDiv.innerHTML = "";
  
  if (stack.length === 0) {
    // Main page - show about if it exists
    let aboutFile = null;
    const archiGrad = fullTree.find(f => f.path === "01_archigrad.io");
    if (archiGrad && archiGrad.embeds) {
      if (archiGrad.embeds.includes("about.txt")) {
        aboutFile = "about.txt";
      } else if (archiGrad.embeds.includes("about.docx")) {
        aboutFile = "about.docx";
      }
    }
    if (aboutFile) {
      if (aboutFile.endsWith(".txt")) {
        fetch(`projects/${archiGrad.path}/${aboutFile}`)
          .then(res => res.text())
          .then(text => {
            folderAboutDiv.innerHTML = `<div class="folder-about-content">${text.trim()}</div>`;
          })
          .catch(() => {
            folderAboutDiv.innerHTML = `<div class="folder-about-content">[${aboutFile} could not be loaded]</div>`;
          });
      }
    }
  } else {
    // Subfolder - no about section
    folderAboutDiv.innerHTML = "";
  }

  // Render folders pinned at top
  renderNodes(currentLevel, stack);

  // Collect all images from current folder and subfolders
  const allImages = [];
  function collectImages(folder) {
    (folder.images || []).forEach((img, i) => {
      const src = `projects/${folder.path}/${img}`;
      const imageList = (folder.images || []).map(image => `projects/${folder.path}/${image}`);
      allImages.push({ src, img, imageList, index: i });
    });
    (folder.children || []).forEach(child => collectImages(child));
  }

  if (currentFolder) {
    collectImages(currentFolder);
  }

  // Shuffle images
  for (let i = allImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
  }

  // Render shuffled images
  allImages.forEach(imgData => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <img src="${imgData.src}" alt="${imgData.img}">
      <h3>${imgData.img}</h3>
    `;
    card.onclick = () => showImageModal(imgData.src, imgData.img, imgData.imageList, imgData.index);
    gallery.appendChild(card);
  });

  // Render videos, pdfs, embeds
  if (currentFolder) {
    renderVideos(currentFolder);
    renderPDFs(currentFolder);
    renderEmbeds(currentFolder);
  }

  addOrRemoveBackButton(stack);
}

function renderNodes(nodes, stack) {
  nodes.forEach(node => {
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
  const headerId = "header-back-btn-wrapper";
  const headerExisting = document.getElementById(headerId);

  if (stack.length > 0) {
    // Main back button (fixed top-left)
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
        if (stack.length === 1) {
          renderMainPage();
        } else {
          const newStack = [...stack];
          newStack.pop();
          const parent = resolveNode(fullTree, newStack);
          renderGallery(parent?.children || fullTree, newStack);
        }
      });
    }

    // Header back button (next to "Projects" text) - only if depth > 1
    if (stack.length > 1) {
      if (!headerExisting) {
        const headerBtn = document.createElement("div");
        headerBtn.id = headerId;
        headerBtn.style.cssText = `
          position: absolute;
          top: 150px;
          left: 0;
          z-index: 100;
        `;
        headerBtn.innerHTML = `
          <button id="header-back-btn" title="Back to parent"
            style="
              font-size: 1.2rem;
              background: none;
              border: none;
              color: #aaa;
              cursor: pointer;
              margin-right: 0.5rem;
            ">◀</button>`;
        document.querySelector("main").insertBefore(headerBtn, document.querySelector("section#projects"));
        document.getElementById("header-back-btn").addEventListener("click", () => {
          const newStack = [...stack];
          newStack.pop();
          const parent = resolveNode(fullTree, newStack);
          renderGallery(parent?.children || fullTree, newStack);
        });
      }
    } else {
      if (headerExisting) headerExisting.remove();
    }
  } else {
    if (existing) existing.remove();
    if (headerExisting) headerExisting.remove();
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

window.addEventListener("keydown", function(e) {
  if (imageOverlay.style.display === "flex") {
    if (e.key === "ArrowLeft" && overlayPrev.style.display !== "none") overlayPrev.onclick(e);
    if (e.key === "ArrowRight" && overlayNext.style.display !== "none") overlayNext.onclick(e);
    if (e.key === "Escape") imageOverlay.onclick({target:imageOverlay});
  }
});