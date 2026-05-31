"use strict";

const API_BASE = "/api";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CANVAS_MAX_WIDTH = 900;
const CANVAS_MAX_HEIGHT = 600;
const CANVAS_SQUARE_SIZE = 700;
const GALLERY_PAGE_SIZE = 6;

let cachedCategories = [];
let cachedTemplates = [];
let cachedGeneratedMemes = [];
let filteredGeneratedMemes = [];
let visibleGalleryCount = GALLERY_PAGE_SIZE;
let currentPreviewMeme = null;
let currentImage = null;
let currentSourceType = null;
let currentTemplateId = null;
let currentOriginalImagePath = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Memoid frontend initialized");

    bindNavigationControls();
    bindDataControls();
    bindEditorControls();
    bindGalleryModalControls();
    bindCategoryManagementControls();
    bindTemplateCreationControls();
    bindBackToTopButton();
    initializePage();
});

function bindNavigationControls() {
    document.querySelectorAll("[data-view-target]").forEach((element) => {
        element.addEventListener("click", (event) => {
            event.preventDefault();
            setActiveView(element.dataset.viewTarget);

            if (element.dataset.openManagement === "true") {
                const management = document.getElementById("management-panel");
                if (management) {
                    management.open = true;
                    management.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }
        });
    });

    const createButton = document.getElementById("create-meme-button");
    if (createButton) {
        createButton.addEventListener("click", openCreateView);
    }
}

function bindDataControls() {
    const categoryFilter = document.getElementById("template-category-filter");
    const favoritesToggle = document.getElementById("favorites-only");
    const gallerySearch = document.getElementById("gallery-search-input");
    const galleryCategoryFilter = document.getElementById("gallery-category-filter");
    const gallerySourceFilter = document.getElementById("gallery-source-filter");
    const loadMoreButton = document.getElementById("load-more-gallery-button");

    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            const categoryId = categoryFilter.value || null;
            loadTemplates(categoryId);
        });
    }

    if (favoritesToggle) {
        favoritesToggle.addEventListener("change", () => {
            resetGalleryVisibleCount();
            applyGalleryFilters();
        });
    }

    if (gallerySearch) {
        gallerySearch.addEventListener("input", () => {
            resetGalleryVisibleCount();
            applyGalleryFilters();
        });
    }

    if (galleryCategoryFilter) {
        galleryCategoryFilter.addEventListener("change", () => {
            resetGalleryVisibleCount();
            applyGalleryFilters();
        });
    }

    if (gallerySourceFilter) {
        gallerySourceFilter.addEventListener("change", () => {
            resetGalleryVisibleCount();
            applyGalleryFilters();
        });
    }

    if (loadMoreButton) {
        loadMoreButton.addEventListener("click", loadMoreGallery);
    }
}

function bindCategoryManagementControls() {
    const createForm = document.getElementById("create-category-form");
    const editForm = document.getElementById("edit-category-form");
    const cancelButton = document.getElementById("cancel-category-edit-button");

    if (createForm) {
        createForm.addEventListener("submit", (event) => {
            event.preventDefault();
            createCategoryFromForm();
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", (event) => {
            event.preventDefault();
            saveCategoryEdit();
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", cancelCategoryEdit);
    }
}

function bindGalleryModalControls() {
    const modal = document.getElementById("meme-preview-modal");
    const closeButton = document.getElementById("meme-preview-close");
    const downloadButton = document.getElementById("meme-preview-download");
    const favoriteButton = document.getElementById("meme-preview-favorite");

    if (closeButton) {
        closeButton.addEventListener("click", closeMemePreview);
    }

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal || event.target.dataset.modalClose === "true") {
                closeMemePreview();
            }
        });
    }

    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            if (currentPreviewMeme) {
                downloadGeneratedMeme(currentPreviewMeme);
            }
        });
    }

    if (favoriteButton) {
        favoriteButton.addEventListener("click", async () => {
            if (currentPreviewMeme) {
                await toggleGeneratedMemeFavorite(currentPreviewMeme.id, favoriteButton);
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMemePreview();
        }
    });
}

function bindTemplateCreationControls() {
    const form = document.getElementById("create-template-form");

    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        createTemplateFromForm();
    });
}

function bindBackToTopButton() {
    const button = document.getElementById("back-to-top-button");

    if (!button) {
        return;
    }

    window.addEventListener("scroll", () => {
        button.classList.toggle("is-visible", window.scrollY > 420);
    });

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function bindEditorControls() {
    const customImageInput = document.getElementById("custom-image-input");
    const saveButton = document.getElementById("save-meme-button");
    const clearButton = document.getElementById("clear-editor-button");
    const cancelButton = document.getElementById("cancel-editor-button");
    const fontSizeInput = document.getElementById("font-size-input");

    if (customImageInput) {
        customImageInput.addEventListener("change", handleCustomImageSelection);
    }

    if (saveButton) {
        saveButton.addEventListener("click", saveMemeToGallery);
    }

    if (clearButton) {
        clearButton.addEventListener("click", clearEditor);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", cancelEditorCreation);
    }

    if (fontSizeInput) {
        fontSizeInput.addEventListener("input", () => {
            updateFontSizeLabel();
            renderCanvas();
        });
    }

    [
        "top-text-input",
        "bottom-text-input",
        "font-family-select",
        "text-color-input",
        "text-position-select",
        "image-effect-select",
        "image-fit-select"
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            const rerender = () => {
                if (id === "text-position-select") {
                    updateTextPositionControls();
                }

                renderCanvas();
            };

            element.addEventListener("input", rerender);
            element.addEventListener("change", rerender);
        }
    });

    bindManualPositionControls();
    updateFontSizeLabel();
    updateTextPositionControls();
    clearCanvas();
    updateEditorActionButtons();
}

async function initializePage() {
    setActiveView("gallery");
    await loadCategories();
    await loadTemplates();
    await loadGeneratedMemes();
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status} для ${url}`);
    }

    return response.json();
}

async function fetchNoContent(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status} для ${url}`);
    }
}

function setActiveView(viewName) {
    document.querySelectorAll(".app-view").forEach((view) => {
        view.classList.toggle("is-active", view.dataset.view === viewName);
    });

    document.querySelectorAll("[data-view-target]").forEach((element) => {
        element.classList.toggle("is-active", element.dataset.viewTarget === viewName);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCreateView() {
    setActiveView("create");
}

function openGalleryView() {
    setActiveView("gallery");
}

function openEditorView() {
    setActiveView("editor");
}

async function loadCategories() {
    const container = document.getElementById("categories-list");
    setLoading(container, "Завантажуємо категорії...");

    try {
        const categories = await fetchJson(`${API_BASE}/meme-categories?includeInactive=true`);
        cachedCategories = Array.isArray(categories) ? categories : [];
        renderCategories(cachedCategories);
        renderTemplateCategoryFilter(cachedCategories);
        renderGalleryCategoryFilter(cachedCategories);
        renderNewTemplateCategorySelect(cachedCategories);
        applyGalleryFilters();
        return cachedCategories;
    } catch (error) {
        console.error("Failed to load categories", error);
        renderError(container, "Не вдалося завантажити категорії.");
        renderTemplateCategoryFilter([]);
        renderGalleryCategoryFilter([]);
        renderNewTemplateCategorySelect([]);
        return null;
    }
}

async function loadTemplates(categoryId = null) {
    const container = document.getElementById("templates-list");
    setLoading(container, "Завантажуємо шаблони...");

    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";

    try {
        const templates = await fetchJson(`${API_BASE}/meme-templates${query}`);
        const safeTemplates = Array.isArray(templates) ? templates : [];
        renderTemplates(safeTemplates);

        if (!categoryId) {
            cachedTemplates = safeTemplates;
            applyGalleryFilters();
        }

        return safeTemplates;
    } catch (error) {
        console.error("Failed to load meme templates", error);
        renderError(container, "Не вдалося завантажити шаблони мемів.");
        return null;
    }
}

async function loadGeneratedMemes() {
    const container = document.getElementById("generated-memes-list");
    setLoading(container, "Завантажуємо меми...");
    setGalleryStatus("loading", "Завантажуємо меми...");

    try {
        const memes = await fetchJson(`${API_BASE}/generated-memes`);
        cachedGeneratedMemes = Array.isArray(memes) ? memes : [];
        resetGalleryVisibleCount();
        applyGalleryFilters();
        return memes;
    } catch (error) {
        console.error("Failed to load generated memes", error);
        renderError(container, "Не вдалося завантажити меми.");
        setGalleryStatus("error", "Не вдалося завантажити галерею мемів.");
        return null;
    }
}

function renderCategories(categories) {
    const container = document.getElementById("categories-list");
    clearElement(container);

    if (!container) {
        return;
    }

    if (!Array.isArray(categories) || categories.length === 0) {
        container.append(createEmptyState("Категорій поки що немає."));
        return;
    }

    categories.forEach((category) => {
        const card = createCard();
        card.append(
            createBadge(category.isActive ? "Активна" : "Неактивна", category.isActive ? "active" : "inactive"),
            createTextElement("h3", category.name || "Без назви"),
            createTextElement("p", category.description || "Опис категорії ще не додано."),
            createMeta([
                formatCount(category.templatesCount, "шаблон", "шаблони", "шаблонів")
            ]),
            createCategoryActions(category)
        );
        container.append(card);
    });
}

function createCategoryActions(category) {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = createActionButton("Редагувати", "button-secondary");
    editButton.addEventListener("click", () => startCategoryEdit(category.id));

    const deleteButtonText = Number(category.templatesCount) > 0
        ? "Деактивувати"
        : "Видалити";
    const deleteButton = createActionButton(deleteButtonText, "button-danger");
    deleteButton.addEventListener("click", () => deleteOrDeactivateCategory(category.id, deleteButton));

    actions.append(editButton, deleteButton);
    return actions;
}

function renderTemplateCategoryFilter(categories) {
    const filter = document.getElementById("template-category-filter");

    if (!filter) {
        return;
    }

    const currentValue = filter.value;
    clearElement(filter);

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Усі категорії";
    filter.append(allOption);

    if (Array.isArray(categories)) {
        categories
            .filter((category) => category.isActive !== false)
            .forEach((category) => {
                const option = document.createElement("option");
                option.value = String(category.id);
                option.textContent = category.name || `Категорія #${category.id}`;
                filter.append(option);
            });
    }

    filter.value = Array.from(filter.options).some((option) => option.value === currentValue)
        ? currentValue
        : "";
}

function renderGalleryCategoryFilter(categories) {
    const filter = document.getElementById("gallery-category-filter");

    if (!filter) {
        return;
    }

    const currentValue = filter.value;
    clearElement(filter);

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Усі категорії";
    filter.append(allOption);

    if (Array.isArray(categories)) {
        categories
            .filter((category) => category.isActive !== false)
            .forEach((category) => {
                const option = document.createElement("option");
                option.value = String(category.id);
                option.textContent = category.name || `Категорія #${category.id}`;
                filter.append(option);
            });
    }

    filter.value = Array.from(filter.options).some((option) => option.value === currentValue)
        ? currentValue
        : "";
}

function renderNewTemplateCategorySelect(categories) {
    const select = document.getElementById("new-template-category");
    const createButton = document.getElementById("create-template-button");

    if (!select) {
        return;
    }

    const currentValue = select.value;
    clearElement(select);

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Оберіть категорію";
    select.append(emptyOption);

    const activeCategories = Array.isArray(categories)
        ? categories.filter((category) => category.isActive !== false)
        : [];

    activeCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = String(category.id);
        option.textContent = category.name || `Категорія #${category.id}`;
        select.append(option);
    });

    select.value = Array.from(select.options).some((option) => option.value === currentValue)
        ? currentValue
        : "";

    const hasCategories = activeCategories.length > 0;
    select.disabled = !hasCategories;

    if (createButton) {
        createButton.disabled = !hasCategories;
    }

    if (!hasCategories) {
        setTemplateFormStatus("error", "Спочатку потрібно створити активну категорію.");
    }
}

function renderTemplates(templates) {
    const container = document.getElementById("templates-list");
    clearElement(container);

    if (!container) {
        return;
    }

    if (!Array.isArray(templates) || templates.length === 0) {
        container.append(createEmptyState("Для вибраної категорії шаблонів поки що немає."));
        return;
    }

    templates.forEach((template) => {
        const card = createCard();
        card.append(
            createImageTile(template.imagePath, "Шаблон мема"),
            createBadge(template.isActive ? "Активний" : "Неактивний", template.isActive ? "active" : "inactive"),
            createTextElement("h3", template.title || "Без назви"),
            createTextElement("p", `Категорія: ${template.categoryName || "Без категорії"}`),
            createMeta([
                formatCount(template.generatedMemesCount, "створений мем", "створені меми", "створених мемів")
            ]),
            createTemplateActions(template)
        );
        container.append(card);
    });
}

function createTemplateActions(template) {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const useButton = createActionButton("Обрати", "button-secondary");
    useButton.addEventListener("click", () => useTemplateInEditor(template.id));

    actions.append(useButton);
    return actions;
}

function renderGeneratedMemes(memes) {
    cachedGeneratedMemes = Array.isArray(memes) ? memes : [];
    resetGalleryVisibleCount();
    applyGalleryFilters();
}

function applyGalleryFilters() {
    const search = getElementValue("gallery-search-input", "").trim().toLowerCase();
    const categoryId = getElementValue("gallery-category-filter", "");
    const sourceType = getElementValue("gallery-source-filter", "");
    const favoritesOnly = getFavoritesOnly();

    filteredGeneratedMemes = cachedGeneratedMemes.filter((meme) => {
        const title = (meme.title || "").toLowerCase();
        const matchesSearch = !search || title.includes(search);
        const matchesFavorite = !favoritesOnly || Boolean(meme.isFavorite);
        const matchesSource = !sourceType || meme.sourceType === sourceType;
        const matchesCategory = !categoryId || String(getMemeTemplateCategoryId(meme) || "") === categoryId;

        return matchesSearch && matchesFavorite && matchesSource && matchesCategory;
    });

    renderGallery();
}

function renderGallery() {
    const container = document.getElementById("generated-memes-list");
    clearElement(container);

    if (!container) {
        updateLoadMoreState();
        return;
    }

    if (filteredGeneratedMemes.length === 0) {
        const message = getEmptyGalleryMessage();
        container.append(createEmptyState(message));
        setGalleryStatus("info", message);
        updateLoadMoreState();
        return;
    }

    filteredGeneratedMemes.slice(0, visibleGalleryCount).forEach((meme) => {
        const card = createCard();
        card.classList.add("gallery-card");
        card.append(
            createImageTile(meme.imagePath, "Зображення не знайдено", meme.title || "Створений мем"),
            createGalleryCardBody(meme)
        );
        container.append(card);
    });

    setGalleryStatus("info", `Показано ${Math.min(visibleGalleryCount, filteredGeneratedMemes.length)} з ${filteredGeneratedMemes.length} мемів.`);
    updateLoadMoreState();
}

function createGalleryCardBody(meme) {
    const body = document.createElement("div");
    body.className = "gallery-card-body";
    body.append(
        createTextElement("h3", meme.title || "Без назви", "gallery-card-title"),
        createGalleryCardMeta(meme),
        createGeneratedMemeActions(meme)
    );
    return body;
}

function createGalleryCardMeta(meme) {
    const meta = document.createElement("div");
    meta.className = "gallery-card-meta";

    const source = document.createElement("span");
    source.textContent = formatSourceType(meme.sourceType);
    meta.append(source);

    const categoryName = getMemeTemplateCategoryName(meme);
    if (categoryName) {
        const category = document.createElement("span");
        category.textContent = categoryName;
        meta.append(category);
    }

    if (meme.isFavorite) {
        const favorite = document.createElement("span");
        favorite.textContent = "★ Улюблений";
        meta.append(favorite);
    }

    return meta;
}

function getEmptyGalleryMessage() {
    if (getFavoritesOnly()) {
        return "Улюблених мемів поки немає.";
    }

    if (getElementValue("gallery-search-input", "").trim()
        || getElementValue("gallery-category-filter", "")
        || getElementValue("gallery-source-filter", "")) {
        return "За вибраними фільтрами мемів не знайдено.";
    }

    return "Поки що мемів немає. Створіть перший мем.";
}

function resetGalleryVisibleCount() {
    visibleGalleryCount = GALLERY_PAGE_SIZE;
}

function loadMoreGallery() {
    visibleGalleryCount += GALLERY_PAGE_SIZE;
    renderGallery();
}

function updateLoadMoreState() {
    const button = document.getElementById("load-more-gallery-button");
    const note = document.getElementById("gallery-load-more-note");

    if (!button || !note) {
        return;
    }

    const hasMore = visibleGalleryCount < filteredGeneratedMemes.length;
    button.hidden = filteredGeneratedMemes.length <= GALLERY_PAGE_SIZE;
    button.disabled = !hasMore;
    note.textContent = filteredGeneratedMemes.length === 0
        ? ""
        : hasMore
            ? ""
            : "Більше мемів немає.";
}

function getMemeTemplate(meme) {
    return cachedTemplates.find((template) => template.id === meme.memeTemplateId) || null;
}

function getMemeTemplateCategoryId(meme) {
    const template = getMemeTemplate(meme);
    return template ? template.memeCategoryId : null;
}

function getMemeTemplateCategoryName(meme) {
    const template = getMemeTemplate(meme);
    return template ? template.categoryName : null;
}

function createGeneratedMemeActions(meme) {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const previewButton = createActionButton("👁", "button-secondary icon-action-button");
    previewButton.title = "Відкрити";
    previewButton.setAttribute("aria-label", "Відкрити мем");
    previewButton.addEventListener("click", () => openMemePreview(meme));

    const downloadButton = createActionButton("⬇", "button-secondary icon-action-button");
    downloadButton.title = "Завантажити";
    downloadButton.setAttribute("aria-label", "Завантажити мем");
    downloadButton.addEventListener("click", () => downloadGeneratedMeme(meme));

    const favoriteButton = createActionButton(
        meme.isFavorite ? "★" : "☆",
        meme.isFavorite ? "button-favorite-active icon-action-button" : "button-secondary icon-action-button"
    );
    favoriteButton.classList.add("favorite-icon-button");
    favoriteButton.title = meme.isFavorite ? "Прибрати з улюблених" : "Додати в улюблені";
    favoriteButton.setAttribute("aria-label", favoriteButton.title);
    favoriteButton.addEventListener("click", () => toggleGeneratedMemeFavorite(meme.id, favoriteButton));

    const deleteButton = createActionButton("🗑", "button-danger icon-action-button");
    deleteButton.title = "Видалити";
    deleteButton.setAttribute("aria-label", "Видалити мем");
    deleteButton.addEventListener("click", () => deleteGeneratedMeme(meme.id, deleteButton));

    actions.append(previewButton, downloadButton, favoriteButton, deleteButton);
    return actions;
}

function createActionButton(text, modifier) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${modifier}`;
    button.textContent = text;
    return button;
}

function createOptionalText(label, value) {
    const normalized = value ? String(value).trim() : "";
    if (!normalized || normalized === "None") {
        return document.createDocumentFragment();
    }

    return createTextElement("p", `${label}: ${normalized}`);
}

async function loadTemplateIntoEditor(templateId) {
    const normalizedTemplateId = Number(templateId);

    if (!normalizedTemplateId) {
        resetEditorSource();
        clearCanvas();
        setEditorStatus("Оберіть шаблон або завантажте власне зображення.", "info");
        return;
    }

    const template = cachedTemplates.find((item) => item.id === normalizedTemplateId);
    if (!template) {
        setCreateStatus("error", "Шаблон не знайдено в завантаженому списку.");
        return;
    }

    try {
        setCreateStatus("loading", "Завантажуємо шаблон у редактор...");
        const image = await loadImage(template.imagePath);
        currentImage = image;
        currentSourceType = "Template";
        currentTemplateId = template.id;
        currentOriginalImagePath = null;
        clearCustomFileInput();
        resetEditorModifications(false);
        updateEditorSourceLabel(template.title || "шаблон");
        openEditorView();
        setCreateStatus("", "");
        setEditorStatus("Шаблон завантажено в редактор.", "success");
        renderCanvas();
        updateEditorActionButtons();
    } catch (error) {
        console.error("Failed to load template image", error);
        resetEditorSource();
        clearCanvas();
        setCreateStatus("error", "Файл шаблона не знайдено. Оберіть інший шаблон або завантажте власне фото.");
    }
}

async function handleCustomImageSelection(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    const validationError = validateClientImage(file);
    if (validationError) {
        setCreateStatus("error", validationError);
        event.target.value = "";
        return;
    }

    try {
        setCreateStatus("loading", "Завантажуємо власне зображення...");
        const uploaded = await uploadFile(`${API_BASE}/uploads/custom`, file);
        const image = await loadImage(uploaded.relativePath);

        currentImage = image;
        currentSourceType = "Custom";
        currentTemplateId = null;
        currentOriginalImagePath = uploaded.relativePath;

        resetEditorModifications(false);
        updateEditorSourceLabel("власне фото");
        openEditorView();
        setCreateStatus("", "");
        setEditorStatus("Власне зображення завантажено в редактор.", "success");
        renderCanvas();
        updateEditorActionButtons();
    } catch (error) {
        console.error("Failed to upload custom image", error);
        setCreateStatus("error", "Не вдалося завантажити зображення.");
    }
}

function clearEditor() {
    resetEditorModifications(true);
}

function resetEditorModifications(showStatus = true) {
    setElementValue("meme-title-input", "");
    setElementValue("top-text-input", "");
    setElementValue("bottom-text-input", "");
    setElementValue("font-family-select", "Arial");
    setElementValue("font-size-input", "48");
    setElementValue("text-color-input", "#ffffff");
    setElementValue("text-position-select", "TopAndBottom");
    setElementValue("image-effect-select", "None");
    setElementValue("image-fit-select", "Original");
    resetManualPositionControls();
    updateFontSizeLabel();
    updateTextPositionControls();
    renderCanvas();
    updateEditorActionButtons();

    if (showStatus) {
        if (currentImage) {
            setEditorStatus("Зміни скинуто. Зображення залишилось у редакторі.", "info");
        } else {
            setEditorStatus("Спочатку оберіть шаблон або завантажте фото.", "error");
        }
    }
}

function resetEditorCompletely() {
    resetEditorSource();
    clearCanvas();
    clearCustomFileInput();
    setElementValue("meme-title-input", "");
    setElementValue("top-text-input", "");
    setElementValue("bottom-text-input", "");
    setElementValue("font-family-select", "Arial");
    setElementValue("font-size-input", "48");
    setElementValue("text-color-input", "#ffffff");
    setElementValue("text-position-select", "TopAndBottom");
    setElementValue("image-effect-select", "None");
    setElementValue("image-fit-select", "Original");
    resetManualPositionControls();
    updateFontSizeLabel();
    updateTextPositionControls();
    updateEditorActionButtons();
    updateEditorSourceLabel("");
    setEditorStatus("Редактор очищено. Оберіть шаблон або завантажте фото.", "info");
}

function cancelEditorCreation() {
    if (!confirm("Скасувати створення мема? Незбережені зміни буде втрачено.")) {
        return;
    }

    resetEditorCompletely();
    openGalleryView();
}

async function createCategoryFromForm() {
    const nameInput = document.getElementById("new-category-name");
    const descriptionInput = document.getElementById("new-category-description");
    const createButton = document.getElementById("create-category-button");

    const name = nameInput ? nameInput.value.trim() : "";
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const validationError = validateCategoryForm(name, description);

    if (validationError) {
        setCategoryFormStatus("error", validationError);
        return;
    }

    try {
        if (createButton) {
            createButton.disabled = true;
            createButton.textContent = "Додаємо...";
        }

        setCategoryFormStatus("loading", "Створюємо категорію...");
        await fetchJson(`${API_BASE}/meme-categories`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                description: description || null
            })
        });

        resetCategoryCreateForm();
        setCategoryFormStatus("success", "Категорію додано.");
        await refreshCategoriesAndTemplates();
    } catch (error) {
        console.error("Failed to create category", error);
        setCategoryFormStatus("error", getFriendlyCategoryError(error));
    } finally {
        if (createButton) {
            createButton.disabled = false;
            createButton.textContent = "Додати категорію";
        }
    }
}

function startCategoryEdit(categoryId) {
    const category = cachedCategories.find((item) => item.id === categoryId);
    const editForm = document.getElementById("edit-category-form");
    const idInput = document.getElementById("edit-category-id");
    const nameInput = document.getElementById("edit-category-name");
    const descriptionInput = document.getElementById("edit-category-description");
    const activeInput = document.getElementById("edit-category-active");

    if (!category || !editForm || !idInput || !nameInput || !descriptionInput || !activeInput) {
        setCategoryFormStatus("error", "Категорію не знайдено.");
        return;
    }

    idInput.value = String(category.id);
    nameInput.value = category.name || "";
    descriptionInput.value = category.description || "";
    activeInput.checked = category.isActive !== false;
    editForm.hidden = false;
    editForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setCategoryFormStatus("info", "Внесіть зміни та натисніть \"Зберегти\".");
}

function cancelCategoryEdit() {
    const editForm = document.getElementById("edit-category-form");
    const idInput = document.getElementById("edit-category-id");
    const nameInput = document.getElementById("edit-category-name");
    const descriptionInput = document.getElementById("edit-category-description");
    const activeInput = document.getElementById("edit-category-active");

    if (idInput) {
        idInput.value = "";
    }

    if (nameInput) {
        nameInput.value = "";
    }

    if (descriptionInput) {
        descriptionInput.value = "";
    }

    if (activeInput) {
        activeInput.checked = true;
    }

    if (editForm) {
        editForm.hidden = true;
    }
}

async function saveCategoryEdit() {
    const idInput = document.getElementById("edit-category-id");
    const nameInput = document.getElementById("edit-category-name");
    const descriptionInput = document.getElementById("edit-category-description");
    const activeInput = document.getElementById("edit-category-active");
    const saveButton = document.getElementById("save-category-button");

    const id = idInput ? Number(idInput.value) : 0;
    const name = nameInput ? nameInput.value.trim() : "";
    const description = descriptionInput ? descriptionInput.value.trim() : "";
    const isActive = Boolean(activeInput && activeInput.checked);
    const validationError = validateCategoryForm(name, description);

    if (!id) {
        setCategoryFormStatus("error", "Категорію не знайдено.");
        return;
    }

    if (validationError) {
        setCategoryFormStatus("error", validationError);
        return;
    }

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Зберігаємо...";
        }

        setCategoryFormStatus("loading", "Зберігаємо категорію...");
        await fetchNoContent(`${API_BASE}/meme-categories/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                description: description || null,
                isActive
            })
        });

        cancelCategoryEdit();
        setCategoryFormStatus("success", "Категорію оновлено.");
        await refreshCategoriesAndTemplates();
    } catch (error) {
        console.error("Failed to update category", error);
        setCategoryFormStatus("error", getFriendlyCategoryError(error));
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Зберегти";
        }
    }
}

async function deleteOrDeactivateCategory(categoryId, button = null) {
    if (!categoryId || !confirm("Видалити або деактивувати цю категорію?")) {
        return;
    }

    try {
        if (button) {
            button.disabled = true;
        }

        setCategoryFormStatus("loading", "Оновлюємо категорії...");
        await fetchNoContent(`${API_BASE}/meme-categories/${categoryId}`, {
            method: "DELETE"
        });

        cancelCategoryEdit();
        setCategoryFormStatus("success", "Категорію видалено або деактивовано.");
        await refreshCategoriesAndTemplates();
    } catch (error) {
        console.error("Failed to delete or deactivate category", error);
        setCategoryFormStatus("error", "Не вдалося видалити або деактивувати категорію.");
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

function validateCategoryForm(name, description) {
    if (!name) {
        return "Вкажіть назву категорії.";
    }

    if (name.length > 80) {
        return "Назва категорії не може бути довшою за 80 символів.";
    }

    if (description && description.length > 300) {
        return "Опис категорії не може бути довшим за 300 символів.";
    }

    return null;
}

function resetCategoryCreateForm() {
    const nameInput = document.getElementById("new-category-name");
    const descriptionInput = document.getElementById("new-category-description");

    if (nameInput) {
        nameInput.value = "";
    }

    if (descriptionInput) {
        descriptionInput.value = "";
    }
}

async function refreshCategoriesAndTemplates() {
    const categoryFilter = document.getElementById("template-category-filter");
    const selectedCategoryId = categoryFilter ? categoryFilter.value : "";

    await loadCategories();
    await loadTemplates();

    if (selectedCategoryId && categoryFilter && categoryFilter.value === selectedCategoryId) {
        await loadTemplates(selectedCategoryId);
    }
}

function getFriendlyCategoryError(error) {
    const message = error && error.message ? error.message : "";

    if (message.includes("вже існує")) {
        return "Категорія з такою назвою вже існує.";
    }

    if (message.includes("не знайдено")) {
        return "Категорію не знайдено.";
    }

    return "Не вдалося зберегти категорію.";
}

async function createTemplateFromForm() {
    const titleInput = document.getElementById("new-template-title");
    const categorySelect = document.getElementById("new-template-category");
    const fileInput = document.getElementById("new-template-file");
    const createButton = document.getElementById("create-template-button");

    const title = titleInput ? titleInput.value.trim() : "";
    const categoryId = categorySelect ? Number(categorySelect.value) : 0;
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    const validationError = validateTemplateForm(title, categoryId, file);
    if (validationError) {
        setTemplateFormStatus("error", validationError);
        return;
    }

    try {
        if (createButton) {
            createButton.disabled = true;
            createButton.textContent = "Додаємо...";
        }

        setTemplateFormStatus("loading", "Завантажуємо зображення шаблона...");
        const uploaded = await uploadFile(`${API_BASE}/uploads/templates`, file);

        setTemplateFormStatus("loading", "Створюємо запис шаблона...");
        await createMemeTemplate({
            title,
            imagePath: uploaded.relativePath,
            memeCategoryId: categoryId
        });

        resetTemplateForm();
        setTemplateFormStatus("success", "Шаблон додано. Тепер його можна обрати в редакторі.");

        await refreshTemplatesAfterTemplateCreate();
    } catch (error) {
        console.error("Failed to create meme template", error);
        setTemplateFormStatus("error", getFriendlyTemplateCreateError(error));
    } finally {
        if (createButton) {
            createButton.textContent = "Додати шаблон";
            createButton.disabled = !hasActiveCategories();
        }
    }
}

function validateTemplateForm(title, categoryId, file) {
    if (!title) {
        return "Вкажіть назву шаблона.";
    }

    if (title.length > 120) {
        return "Назва шаблона не може бути довшою за 120 символів.";
    }

    if (!categoryId) {
        return "Оберіть категорію шаблона.";
    }

    if (!file) {
        return "Оберіть зображення шаблона.";
    }

    return validateClientImage(file);
}

async function createMemeTemplate(payload) {
    return fetchJson(`${API_BASE}/meme-templates`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

async function refreshTemplatesAfterTemplateCreate() {
    const categoryFilter = document.getElementById("template-category-filter");
    const selectedCategoryId = categoryFilter ? categoryFilter.value : "";

    await loadTemplates();

    if (selectedCategoryId) {
        await loadTemplates(selectedCategoryId);
    }
}

function resetTemplateForm() {
    const titleInput = document.getElementById("new-template-title");
    const categorySelect = document.getElementById("new-template-category");
    const fileInput = document.getElementById("new-template-file");

    if (titleInput) {
        titleInput.value = "";
    }

    if (categorySelect) {
        categorySelect.value = "";
    }

    if (fileInput) {
        fileInput.value = "";
    }
}

async function useTemplateInEditor(templateId) {
    await loadTemplateIntoEditor(templateId);
}

function hasActiveCategories() {
    return cachedCategories.some((category) => category.isActive !== false);
}

function getFriendlyTemplateCreateError(error) {
    const message = error && error.message ? error.message : "";

    if (message.includes("вже існує")) {
        return "Шаблон з такою назвою вже існує.";
    }

    if (message.includes("Непідтримуваний") || message.includes("формати")) {
        return "Підтримуються лише JPG, PNG або WEBP.";
    }

    return "Не вдалося додати шаблон.";
}

function validateClientImage(file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return "Підтримуються лише JPG, PNG або WEBP.";
    }

    if (file.size > MAX_UPLOAD_SIZE) {
        return "Файл завеликий. Максимальний розмір — 5 МБ.";
    }

    return null;
}

async function uploadFile(endpoint, fileOrBlob, fileName = "memoid-image.png") {
    const formData = new FormData();
    formData.append("file", fileOrBlob, fileOrBlob.name || fileName);

    return fetchJson(endpoint, {
        method: "POST",
        body: formData,
        headers: {}
    });
}

async function createGeneratedMeme(payload) {
    return fetchJson(`${API_BASE}/generated-memes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

function renderCanvas() {
    const canvas = document.getElementById("meme-canvas");
    const emptyState = document.getElementById("canvas-empty-state");

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d");

    if (!currentImage) {
        clearCanvas();
        return;
    }

    const fitMode = getEditorValue("image-fit-select", "Original");
    const { width, height } = getCanvasSize(currentImage, fitMode);
    canvas.width = width;
    canvas.height = height;

    if (emptyState) {
        emptyState.classList.add("is-hidden");
    }

    drawBaseImage(ctx, canvas, currentImage, getEditorValue("image-effect-select", "None"), fitMode);
    drawMemeText(ctx, canvas);
}

function clearCanvas() {
    const canvas = document.getElementById("meme-canvas");
    const emptyState = document.getElementById("canvas-empty-state");

    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = CANVAS_MAX_WIDTH;
    canvas.height = CANVAS_MAX_HEIGHT;

    if (emptyState) {
        emptyState.classList.remove("is-hidden");
    }

    updateEditorActionButtons();
}

function getCanvasSize(image, fitMode = "Original") {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (fitMode === "Contain" || fitMode === "Cover") {
        return {
            width: CANVAS_MAX_WIDTH,
            height: CANVAS_MAX_HEIGHT
        };
    }

    if (fitMode === "Square") {
        return {
            width: CANVAS_SQUARE_SIZE,
            height: CANVAS_SQUARE_SIZE
        };
    }

    const scale = Math.min(CANVAS_MAX_WIDTH / sourceWidth, CANVAS_MAX_HEIGHT / sourceHeight, 1);

    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale))
    };
}

function getImageDrawRect(image, canvas, fitMode = "Original") {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (fitMode === "Original") {
        return {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height
        };
    }

    const scale = fitMode === "Contain"
        ? Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight)
        : Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;

    return {
        x: (canvas.width - width) / 2,
        y: (canvas.height - height) / 2,
        width,
        height
    };
}

function drawBaseImage(ctx, canvas, image, effect, fitMode = "Original") {
    const drawRect = getImageDrawRect(image, canvas, fitMode);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = effect === "Blur" ? "blur(2px)" : "none";

    if (effect === "Shakal") {
        drawShakalizedImage(ctx, canvas, image, fitMode);
    } else {
        ctx.drawImage(image, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
    }

    ctx.filter = "none";

    if (effect === "Grayscale" || effect === "Contrast" || effect === "Red") {
        applyPixelEffect(ctx, canvas, effect);
    }
}

function drawShakalizedImage(ctx, canvas, image, fitMode = "Original") {
    const smallCanvas = document.createElement("canvas");
    const smallCtx = smallCanvas.getContext("2d");
    smallCanvas.width = Math.max(24, Math.round(canvas.width / 8));
    smallCanvas.height = Math.max(24, Math.round(canvas.height / 8));
    const smallDrawRect = getImageDrawRect(image, smallCanvas, fitMode);

    smallCtx.fillStyle = "#020617";
    smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(image, smallDrawRect.x, smallDrawRect.y, smallDrawRect.width, smallDrawRect.height);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(smallCanvas, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;

    applyNoise(ctx, canvas, 26);
}

function applyPixelEffect(ctx, canvas, effect) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let red = data[i];
        let green = data[i + 1];
        let blue = data[i + 2];

        if (effect === "Grayscale") {
            const gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }

        if (effect === "Contrast") {
            const factor = 1.35;
            data[i] = clampColor((red - 128) * factor + 128);
            data[i + 1] = clampColor((green - 128) * factor + 128);
            data[i + 2] = clampColor((blue - 128) * factor + 128);
        }

        if (effect === "Red") {
            data[i] = clampColor(red + 55);
            data[i + 1] = clampColor(green * 0.72);
            data[i + 2] = clampColor(blue * 0.72);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyNoise(ctx, canvas, amount) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.floor((Math.random() - 0.5) * amount);
        data[i] = clampColor(data[i] + noise);
        data[i + 1] = clampColor(data[i + 1] + noise);
        data[i + 2] = clampColor(data[i + 2] + noise);
    }

    ctx.putImageData(imageData, 0, 0);
}

function drawMemeText(ctx, canvas) {
    const topText = getEditorValue("top-text-input", "");
    const bottomText = getEditorValue("bottom-text-input", "");
    const position = getEditorValue("text-position-select", "TopAndBottom");
    const fontFamily = getEditorValue("font-family-select", "Arial");
    const fontSize = Number(getEditorValue("font-size-input", "48"));
    const textColor = getEditorValue("text-color-input", "#ffffff");
    const lineHeight = Math.round(fontSize * 1.16);
    const padding = Math.max(16, Math.round(fontSize * 0.55));
    const maxWidth = canvas.width - padding * 2;
    const topY = padding + lineHeight * 0.55;
    const bottomY = canvas.height - padding - lineHeight * 0.55;

    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(3, Math.round(fontSize / 12));

    if (position === "TopAndBottom") {
        drawWrappedText(ctx, topText, canvas.width / 2, topY, maxWidth, lineHeight, "top");
        drawWrappedText(ctx, bottomText, canvas.width / 2, bottomY, maxWidth, lineHeight, "bottom");
    } else if (position === "Top") {
        drawWrappedText(ctx, topText, canvas.width / 2, topY, maxWidth, lineHeight, "top");
    } else if (position === "Center") {
        drawWrappedText(ctx, topText, canvas.width / 2, canvas.height / 2, maxWidth, lineHeight, "center");
    } else if (position === "Bottom") {
        drawWrappedText(ctx, bottomText, canvas.width / 2, bottomY, maxWidth, lineHeight, "bottom");
    } else if (position === "Manual") {
        const coordinates = getManualPositionCoordinates();
        const manualMaxWidth = Math.max(80, canvas.width - padding * 4);
        const point = getManualTextPoint(canvas, coordinates, padding, lineHeight, manualMaxWidth);
        drawWrappedText(
            ctx,
            topText,
            point.x,
            point.y,
            manualMaxWidth,
            lineHeight,
            "center"
        );
    }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, alignMode) {
    const lines = wrapText(ctx, text, maxWidth).slice(0, 6);
    if (lines.length === 0) {
        return;
    }

    let startY = y;

    if (alignMode === "center") {
        startY = y - ((lines.length - 1) * lineHeight) / 2;
    }

    if (alignMode === "bottom") {
        startY = y - (lines.length - 1) * lineHeight;
    }

    lines.forEach((line, index) => {
        const lineY = startY + index * lineHeight;
        ctx.strokeText(line, x, lineY);
        ctx.fillText(line, x, lineY);
    });
}

function wrapText(ctx, text, maxWidth) {
    const cleanText = (text || "").trim();
    if (!cleanText) {
        return [];
    }

    const words = cleanText.split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
        const testLine = line ? `${line} ${word}` : word;

        if (ctx.measureText(testLine).width <= maxWidth) {
            line = testLine;
            return;
        }

        if (line) {
            lines.push(line);
        }

        line = word;

        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
            let splitIndex = line.length - 1;
            while (splitIndex > 1 && ctx.measureText(line.slice(0, splitIndex)).width > maxWidth) {
                splitIndex -= 1;
            }
            lines.push(line.slice(0, splitIndex));
            line = line.slice(splitIndex);
        }
    });

    if (line) {
        lines.push(line);
    }

    return lines;
}

function downloadGeneratedMeme(meme) {
    if (!meme || !meme.imagePath) {
        setGalleryStatus("error", "Немає зображення для завантаження.");
        return;
    }

    const link = document.createElement("a");
    link.href = meme.imagePath;
    link.download = `memoid-${meme.id || "meme"}.png`;
    document.body.append(link);
    link.click();
    link.remove();
}

async function toggleGeneratedMemeFavorite(id, button = null) {
    if (!id) {
        return;
    }

    try {
        if (button) {
            button.disabled = true;
        }

        const updatedMeme = await fetchJson(`${API_BASE}/generated-memes/${id}/favorite`, {
            method: "PATCH"
        });

        currentPreviewMeme = currentPreviewMeme && currentPreviewMeme.id === id ? updatedMeme : currentPreviewMeme;
        setGalleryStatus("success", updatedMeme.isFavorite ? "Мем додано до улюблених." : "Мем прибрано з улюблених.");
        await loadGeneratedMemes(getFavoritesOnly());

        if (currentPreviewMeme && currentPreviewMeme.id === id) {
            updatePreviewFavoriteButton(currentPreviewMeme);
        }
    } catch (error) {
        console.error("Failed to toggle generated meme favorite", error);
        setGalleryStatus("error", "Не вдалося змінити статус улюбленого мема.");
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

async function deleteGeneratedMeme(id, button = null) {
    if (!id || !confirm("Видалити цей мем з галереї?")) {
        return;
    }

    try {
        if (button) {
            button.disabled = true;
        }

        await fetchNoContent(`${API_BASE}/generated-memes/${id}`, {
            method: "DELETE"
        });

        if (currentPreviewMeme && currentPreviewMeme.id === id) {
            closeMemePreview();
        }

        setGalleryStatus("success", "Мем видалено з галереї.");
        await loadGeneratedMemes(getFavoritesOnly());
    } catch (error) {
        console.error("Failed to delete generated meme", error);
        setGalleryStatus("error", "Не вдалося видалити мем.");
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

async function saveMemeToGallery() {
    if (!currentImage) {
        setEditorStatus("Спочатку оберіть або завантажте зображення.", "error");
        return;
    }

    const titleValidationError = validateMemeTitle();
    if (titleValidationError) {
        setEditorStatus(titleValidationError, "error");
        return;
    }

    const saveButton = document.getElementById("save-meme-button");

    try {
        if (saveButton) {
            saveButton.disabled = true;
        }

        setEditorStatus("Зберігаємо мем у галерею...", "info");
        renderCanvas();

        const canvas = document.getElementById("meme-canvas");
        const blob = await canvasToBlob(canvas);
        const uploaded = await uploadFile(`${API_BASE}/uploads/generated`, blob, "memoid-meme.png");
        const payload = buildGeneratedMemePayload(uploaded.relativePath);

        await createGeneratedMeme(payload);
        setEditorStatus("Мем збережено в галерею.", "success");
        await loadGeneratedMemes();
        openGalleryView();
        setGalleryStatus("success", "Мем збережено в галерею.");
        if (getFavoritesOnly()) {
            setGalleryStatus("success", "Мем збережено, але фільтр показує тільки улюблені. Вимкніть фільтр, щоб побачити новий мем.");
        }
    } catch (error) {
        console.error("Failed to save generated meme", error);
        setEditorStatus("Не вдалося зберегти мем.", "error");
    } finally {
        updateEditorActionButtons();
    }
}

function buildGeneratedMemePayload(imagePath) {
    const sourceType = currentSourceType === "Template" ? "Template" : "Custom";
    const title = getEditorValue("meme-title-input", "").trim();
    const textPosition = getEditorValue("text-position-select", "TopAndBottom");
    const topText = getEditorValue("top-text-input", "").trim();
    const bottomText = getEditorValue("bottom-text-input", "").trim();

    return {
        title,
        imagePath,
        sourceType,
        memeTemplateId: sourceType === "Template" ? currentTemplateId : null,
        originalImagePath: sourceType === "Custom" ? currentOriginalImagePath : null,
        topText: ["TopAndBottom", "Top", "Center", "Manual"].includes(textPosition) ? topText || null : null,
        bottomText: ["TopAndBottom", "Bottom"].includes(textPosition) ? bottomText || null : null,
        textPosition,
        fontFamily: getEditorValue("font-family-select", "Arial"),
        fontSize: Number(getEditorValue("font-size-input", "48")),
        textColor: getEditorValue("text-color-input", "#ffffff"),
        textBackgroundColor: null,
        appliedEffect: buildAppliedEffectMetadata()
    };
}

function validateMemeTitle() {
    const title = getEditorValue("meme-title-input", "").trim();

    if (!title) {
        return "Вкажіть назву мема.";
    }

    if (title.length < 3 || title.length > 20) {
        return "Назва мема має містити від 3 до 20 символів.";
    }

    return null;
}

function buildAppliedEffectMetadata() {
    const effect = getEditorValue("image-effect-select", "None");
    const fitMode = getEditorValue("image-fit-select", "Original");
    const textPosition = getEditorValue("text-position-select", "TopAndBottom");
    const parts = [];

    if (effect !== "None") {
        parts.push(effect);
    } else {
        parts.push("None");
    }

    if (fitMode !== "Original") {
        parts.push(`Fit: ${fitMode}`);
    }

    if (textPosition === "Manual") {
        const coordinates = getManualPositionCoordinates();
        parts.push(`Position: ${coordinates.x}%,${coordinates.y}%`);
    }

    return parts.join(" + ");
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Canvas could not be converted to Blob."));
            }
        }, "image/png");
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error("Image path is empty."));
            return;
        }

        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        image.src = src;
    });
}

function getTextPositionLabel(position) {
    const labels = {
        TopAndBottom: "Зверху і знизу",
        Top: "Зверху",
        Bottom: "Знизу",
        Center: "По центру",
        Manual: "За координатами"
    };

    return labels[position] || position || "";
}

function getMemeTextSummary(meme) {
    const position = meme.textPosition || "TopAndBottom";
    const parts = [];

    if (position === "TopAndBottom") {
        if (meme.topText) {
            parts.push(`Верхній текст: ${meme.topText}`);
        }

        if (meme.bottomText) {
            parts.push(`Нижній текст: ${meme.bottomText}`);
        }
    } else if (position === "Top" && meme.topText) {
        parts.push(`Текст зверху: ${meme.topText}`);
    } else if (position === "Bottom" && meme.bottomText) {
        parts.push(`Текст знизу: ${meme.bottomText}`);
    } else if (position === "Center" && meme.topText) {
        parts.push(`Текст по центру: ${meme.topText}`);
    } else if (position === "Manual" && meme.topText) {
        parts.push(`Текст за координатами: ${meme.topText}`);
        const coordinates = getManualCoordinatesFromEffect(meme.appliedEffect);
        if (coordinates) {
            parts.push(`Координати: ${coordinates}`);
        }
    }

    if (parts.length === 0 && (meme.topText || meme.bottomText)) {
        if (meme.topText) {
            parts.push(`Текст: ${meme.topText}`);
        }

        if (meme.bottomText) {
            parts.push(`Додатковий текст: ${meme.bottomText}`);
        }
    }

    return parts;
}

function getManualCoordinatesFromEffect(effect) {
    const match = String(effect || "").match(/Position:\s*([0-9]{1,3}%,[0-9]{1,3}%)/);
    return match ? match[1] : "";
}

function openMemePreview(meme) {
    currentPreviewMeme = meme;

    const modal = document.getElementById("meme-preview-modal");
    const image = document.getElementById("meme-preview-image");
    const placeholder = document.getElementById("meme-preview-placeholder");
    const title = document.getElementById("meme-preview-title");
    const meta = document.getElementById("meme-preview-meta");
    const text = document.getElementById("meme-preview-text");

    if (!modal || !image || !placeholder || !title || !meta || !text) {
        return;
    }

    title.textContent = meme.title || "Без назви";
    clearElement(meta);
    clearElement(text);

    [
        ["Джерело", formatSourceType(meme.sourceType)],
        meme.templateTitle ? ["Шаблон", meme.templateTitle] : null,
        meme.textPosition ? ["Позиція тексту", getTextPositionLabel(meme.textPosition)] : null,
        ["Створено", formatDate(meme.createdAt)],
        meme.appliedEffect ? ["Ефект", formatEffectName(meme.appliedEffect)] : null
    ].filter(Boolean).forEach(([label, value]) => {
        meta.append(createPreviewMetaRow(label, value));
    });

    const textRows = getMemeTextSummary(meme);
    textRows.forEach((row) => {
        text.append(createTextElement("p", row, "preview-text-row"));
    });
    text.hidden = textRows.length === 0;

    placeholder.classList.add("is-hidden");
    image.classList.remove("is-hidden");
    image.alt = meme.title || "Створений мем";
    image.onerror = () => {
        image.classList.add("is-hidden");
        placeholder.classList.remove("is-hidden");
    };
    image.src = meme.imagePath || "";

    if (!meme.imagePath) {
        image.classList.add("is-hidden");
        placeholder.classList.remove("is-hidden");
    }

    updatePreviewFavoriteButton(meme);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function createPreviewMetaRow(label, value) {
    const row = document.createElement("p");
    row.className = "preview-meta-row";

    const labelElement = document.createElement("span");
    labelElement.className = "preview-meta-label";
    labelElement.textContent = `${label}: `;

    const valueElement = document.createElement("span");
    valueElement.textContent = value || "немає даних";

    row.append(labelElement, valueElement);
    return row;
}

function closeMemePreview() {
    const modal = document.getElementById("meme-preview-modal");
    const image = document.getElementById("meme-preview-image");

    if (modal) {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
    }

    if (image) {
        image.removeAttribute("src");
    }

    document.body.classList.remove("modal-open");
    currentPreviewMeme = null;
}

function updatePreviewFavoriteButton(meme) {
    const button = document.getElementById("meme-preview-favorite");

    if (!button) {
        return;
    }

    button.textContent = meme.isFavorite ? "Прибрати з улюблених" : "В улюблені";
    button.classList.toggle("button-favorite-active", Boolean(meme.isFavorite));
    button.classList.toggle("button-secondary", !meme.isFavorite);
}

function setEditorStatus(message, type = "info") {
    const status = document.getElementById("editor-status");

    if (!status) {
        return;
    }

    status.classList.remove("success", "error");
    if (type === "success" || type === "error") {
        status.classList.add(type);
    }
    status.textContent = message;
}

function setGalleryStatus(type, message) {
    const status = document.getElementById("gallery-status");

    if (!status) {
        return;
    }

    status.classList.remove("success", "error", "loading");
    if (type === "success" || type === "error" || type === "loading") {
        status.classList.add(type);
    }
    status.textContent = message;
}

function setCategoryFormStatus(type, message) {
    const status = document.getElementById("category-form-status");

    if (!status) {
        return;
    }

    status.classList.remove("success", "error", "loading");
    if (type === "success" || type === "error" || type === "loading") {
        status.classList.add(type);
    }
    status.textContent = message;
}

function setTemplateFormStatus(type, message) {
    const status = document.getElementById("template-form-status");

    if (!status) {
        return;
    }

    status.classList.remove("success", "error", "loading");
    if (type === "success" || type === "error" || type === "loading") {
        status.classList.add(type);
    }
    status.textContent = message;
}

function setCreateStatus(type, message) {
    const status = document.getElementById("create-status");

    if (!status) {
        return;
    }

    status.classList.remove("success", "error", "loading", "is-hidden");
    if (type === "success" || type === "error" || type === "loading") {
        status.classList.add(type);
    }

    status.textContent = message || "";
    status.classList.toggle("is-hidden", !message);
}

function createCard() {
    const card = document.createElement("article");
    card.className = "data-card";
    return card;
}

function createTextElement(tagName, text, className = "") {
    const element = document.createElement(tagName);
    element.textContent = text;

    if (className) {
        element.className = className;
    }

    return element;
}

function createBadge(text, modifier = "") {
    const badge = document.createElement("span");
    badge.className = modifier ? `card-badge ${modifier}` : "card-badge";
    badge.textContent = text;
    return badge;
}

function createMeta(items) {
    const meta = document.createElement("div");
    meta.className = "data-card-meta";

    items.forEach((item) => {
        meta.append(createBadge(item));
    });

    return meta;
}

function createImageTile(src, placeholderText, altText = placeholderText) {
    const tile = document.createElement("div");
    tile.className = "image-tile";

    const placeholder = document.createElement("span");
    placeholder.className = "image-placeholder-text";
    placeholder.textContent = placeholderText;

    if (!src) {
        tile.append(placeholder);
        return tile;
    }

    const image = document.createElement("img");
    image.alt = altText;
    image.loading = "lazy";
    image.src = src;
    image.onerror = () => {
        image.remove();
        if (!tile.contains(placeholder)) {
            tile.append(placeholder);
        }
    };

    tile.append(image);
    return tile;
}

function createEmptyState(message) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = message;
    return empty;
}

function setLoading(container, message) {
    clearElement(container);

    if (!container) {
        return;
    }

    const loading = document.createElement("p");
    loading.className = "loading-card";
    loading.textContent = message;
    container.append(loading);
}

function renderError(container, message) {
    clearElement(container);

    if (!container) {
        return;
    }

    const error = createEmptyState(message);
    error.classList.add("error");
    container.append(error);
}

function clearElement(element) {
    if (!element) {
        return;
    }

    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function resetEditorSource() {
    currentImage = null;
    currentSourceType = null;
    currentTemplateId = null;
    currentOriginalImagePath = null;
    updateEditorSourceLabel("");
    updateEditorActionButtons();
}

function clearCustomFileInput() {
    const input = document.getElementById("custom-image-input");
    if (input) {
        input.value = "";
    }
}

function updateEditorActionButtons() {
    const hasImage = Boolean(currentImage);

    [
        "save-meme-button",
        "clear-editor-button"
    ].forEach((id) => {
        const button = document.getElementById(id);
        if (button) {
            button.disabled = !hasImage;
        }
    });
}

function updateTextPositionControls() {
    const position = getEditorValue("text-position-select", "TopAndBottom");
    const topLabel = document.getElementById("top-text-label");
    const bottomLabel = document.getElementById("bottom-text-label");
    const topInput = document.getElementById("top-text-input");
    const bottomInput = document.getElementById("bottom-text-input");
    const topField = document.getElementById("top-text-field") || (topInput ? topInput.closest(".field") : null);
    const bottomField = document.getElementById("bottom-text-field") || (bottomInput ? bottomInput.closest(".field") : null);
    const manualControls = document.getElementById("manual-position-controls");

    if (!topInput || !bottomInput) {
        return;
    }

    const showTop = position === "TopAndBottom" || position === "Top" || position === "Center" || position === "Manual";
    const showBottom = position === "TopAndBottom" || position === "Bottom";

    topInput.disabled = !showTop;
    bottomInput.disabled = !showBottom;
    topInput.placeholder = getTopTextPlaceholder(position);
    bottomInput.placeholder = getBottomTextPlaceholder(position);

    if (topField) {
        topField.classList.toggle("text-field-hidden", !showTop);
    }

    if (bottomField) {
        bottomField.classList.toggle("text-field-hidden", !showBottom);
    }

    if (topLabel) {
        topLabel.textContent = getTopTextLabel(position);
    }

    if (bottomLabel) {
        bottomLabel.textContent = getBottomTextLabel(position);
    }

    if (manualControls) {
        manualControls.hidden = position !== "Manual";
    }
}

function getTopTextLabel(position) {
    if (position === "Top") {
        return "Текст зверху";
    }

    if (position === "Center") {
        return "Текст по центру";
    }

    if (position === "Manual") {
        return "Текст";
    }

    return "Верхній текст";
}

function getBottomTextLabel(position) {
    return position === "Bottom" ? "Текст знизу" : "Нижній текст";
}

function getTopTextPlaceholder(position) {
    return getTopTextLabel(position);
}

function getBottomTextPlaceholder(position) {
    return getBottomTextLabel(position);
}

function bindManualPositionControls() {
    ["x", "y"].forEach((axis) => {
        const range = document.getElementById(`manual-text-${axis}`);
        const number = document.getElementById(`manual-text-${axis}-number`);

        if (range) {
            range.addEventListener("input", () => syncManualPositionInputs(axis, "range"));
        }

        if (number) {
            number.addEventListener("input", () => syncManualPositionInputs(axis, "number"));
        }
    });
}

function syncManualPositionInputs(axis, source) {
    const range = document.getElementById(`manual-text-${axis}`);
    const number = document.getElementById(`manual-text-${axis}-number`);

    if (!range || !number) {
        return;
    }

    const sourceElement = source === "number" ? number : range;
    const value = clampPercent(sourceElement.value);
    range.value = String(value);
    number.value = String(value);
    renderCanvas();
}

function resetManualPositionControls() {
    ["x", "y"].forEach((axis) => {
        const range = document.getElementById(`manual-text-${axis}`);
        const number = document.getElementById(`manual-text-${axis}-number`);

        if (range) {
            range.value = "50";
        }

        if (number) {
            number.value = "50";
        }
    });
}

function getManualPositionCoordinates() {
    return {
        x: clampPercent(getEditorValue("manual-text-x", "50")),
        y: clampPercent(getEditorValue("manual-text-y", "50"))
    };
}

function getManualTextPoint(canvas, coordinates, padding, lineHeight, maxTextWidth) {
    const halfTextWidth = Math.min(maxTextWidth / 2, Math.max(0, canvas.width / 2 - padding));
    const minX = padding + halfTextWidth;
    const maxX = canvas.width - padding - halfTextWidth;
    const minY = padding + lineHeight / 2;
    const maxY = canvas.height - padding - lineHeight / 2;

    const safeMinX = maxX >= minX ? minX : canvas.width / 2;
    const safeMaxX = maxX >= minX ? maxX : canvas.width / 2;
    const safeMinY = maxY >= minY ? minY : canvas.height / 2;
    const safeMaxY = maxY >= minY ? maxY : canvas.height / 2;

    return {
        x: safeMinX + (safeMaxX - safeMinX) * coordinates.x / 100,
        y: safeMinY + (safeMaxY - safeMinY) * coordinates.y / 100
    };
}

function clampPercent(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return 50;
    }

    return Math.min(100, Math.max(0, Math.round(number)));
}

function updateEditorSourceLabel(label) {
    const sourceLabel = document.getElementById("editor-source-label");

    if (!sourceLabel) {
        return;
    }

    sourceLabel.textContent = label ? `Джерело: ${label}` : "Джерело не вибрано";
}

function getEditorValue(id, fallback) {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
}

function getElementValue(id, fallback = "") {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
}

function setElementValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function getFavoritesOnly() {
    const toggle = document.getElementById("favorites-only");
    return Boolean(toggle && toggle.checked);
}

function updateFontSizeLabel() {
    const input = document.getElementById("font-size-input");
    const value = document.getElementById("font-size-value");

    if (input && value) {
        value.textContent = `${input.value} px`;
    }
}

function clampColor(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function formatSourceType(sourceType) {
    if (sourceType === "Template") {
        return "Шаблон";
    }

    if (sourceType === "Custom") {
        return "Власне фото";
    }

    return sourceType || "невідомо";
}

function formatEffectName(effect) {
    if (effect && effect.includes(" + ")) {
        return effect.split(" + ").map(formatEffectName).join(" + ");
    }

    if (effect && effect.startsWith("Fit: ")) {
        return `Кадрування: ${formatEffectName(effect.replace("Fit: ", ""))}`;
    }

    if (effect && effect.startsWith("Position: ")) {
        return `Координати: ${effect.replace("Position: ", "")}`;
    }

    const effects = {
        None: "Без ефекту",
        Grayscale: "Чорно-білий",
        Contrast: "Контраст",
        Red: "Червоний фільтр",
        Blur: "Легке розмиття",
        Shakal: "Шакалізація",
        Original: "Оригінальні пропорції",
        Contain: "Вписати повністю",
        Cover: "Заповнити полотно",
        Square: "Квадратний мем"
    };

    return effects[effect] || effect || "";
}

function formatDate(value) {
    if (!value) {
        return "невідомо";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "невідомо";
    }

    return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatCount(value, one, few, many) {
    const count = Number(value) || 0;
    const abs = Math.abs(count);
    const lastTwo = abs % 100;
    const last = abs % 10;
    let word = many;

    if (lastTwo < 11 || lastTwo > 14) {
        if (last === 1) {
            word = one;
        } else if (last >= 2 && last <= 4) {
            word = few;
        }
    }

    return `${count} ${word}`;
}
