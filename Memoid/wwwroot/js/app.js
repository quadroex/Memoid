"use strict";

const API_BASE = "/api";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CANVAS_MAX_WIDTH = 900;
const CANVAS_MAX_HEIGHT = 600;

let cachedCategories = [];
let cachedTemplates = [];
let cachedGeneratedMemes = [];
let currentPreviewMeme = null;
let currentImage = null;
let currentSourceType = null;
let currentTemplateId = null;
let currentOriginalImagePath = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Memoid frontend initialized");

    bindDataControls();
    bindEditorControls();
    bindGalleryModalControls();
    bindCategoryManagementControls();
    bindTemplateCreationControls();
    initializePage();
});

function bindDataControls() {
    const categoryFilter = document.getElementById("template-category-filter");
    const favoritesToggle = document.getElementById("favorites-only");

    if (categoryFilter) {
        categoryFilter.addEventListener("change", () => {
            const categoryId = categoryFilter.value || null;
            loadTemplates(categoryId);
        });
    }

    if (favoritesToggle) {
        favoritesToggle.addEventListener("change", () => {
            loadGeneratedMemes(favoritesToggle.checked);
        });
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

function bindEditorControls() {
    const templateSelect = document.getElementById("editor-template-select");
    const customImageInput = document.getElementById("custom-image-input");
    const redrawButton = document.getElementById("redraw-meme-button");
    const downloadButton = document.getElementById("download-meme-button");
    const saveButton = document.getElementById("save-meme-button");
    const fontSizeInput = document.getElementById("font-size-input");

    if (templateSelect) {
        templateSelect.addEventListener("change", handleTemplateSelection);
    }

    if (customImageInput) {
        customImageInput.addEventListener("change", handleCustomImageSelection);
    }

    if (redrawButton) {
        redrawButton.addEventListener("click", renderCanvas);
    }

    if (downloadButton) {
        downloadButton.addEventListener("click", downloadCanvasMeme);
    }

    if (saveButton) {
        saveButton.addEventListener("click", saveMemeToGallery);
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
        "image-effect-select"
    ].forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("input", renderCanvas);
            element.addEventListener("change", renderCanvas);
        }
    });

    updateFontSizeLabel();
    clearCanvas();
}

async function initializePage() {
    setApiStatus("loading", "Завантажуємо дані з Web API...");

    const categories = await loadCategories();
    const templates = await loadTemplates();
    const memes = await loadGeneratedMemes();

    const successfulLoads = [categories, templates, memes].filter((result) => result !== null).length;

    if (successfulLoads === 3) {
        setApiStatus("success", "Frontend успішно отримав дані з API.");
    } else if (successfulLoads > 0) {
        setApiStatus("error", "Частину даних завантажено, але деякі API-запити завершилися помилкою.");
    } else {
        setApiStatus("error", "Не вдалося завантажити дані з API. Перевірте, чи запущений backend.");
    }
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

async function loadCategories() {
    const container = document.getElementById("categories-list");
    setLoading(container, "Завантажуємо категорії...");

    try {
        const categories = await fetchJson(`${API_BASE}/meme-categories?includeInactive=true`);
        cachedCategories = Array.isArray(categories) ? categories : [];
        renderCategories(cachedCategories);
        renderTemplateCategoryFilter(cachedCategories);
        renderNewTemplateCategorySelect(cachedCategories);
        return cachedCategories;
    } catch (error) {
        console.error("Failed to load categories", error);
        renderError(container, "Не вдалося завантажити категорії.");
        renderTemplateCategoryFilter([]);
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
            renderEditorTemplateSelect(cachedTemplates);
        }

        return safeTemplates;
    } catch (error) {
        console.error("Failed to load meme templates", error);
        renderError(container, "Не вдалося завантажити шаблони мемів.");
        return null;
    }
}

async function loadGeneratedMemes(favoritesOnly = false) {
    const container = document.getElementById("generated-memes-list");
    setLoading(container, "Завантажуємо галерею...");
    setGalleryStatus("loading", "Завантажуємо галерею...");

    const query = favoritesOnly ? "?favoritesOnly=true" : "";

    try {
        const memes = await fetchJson(`${API_BASE}/generated-memes${query}`);
        cachedGeneratedMemes = Array.isArray(memes) ? memes : [];
        renderGeneratedMemes(cachedGeneratedMemes);
        setGalleryStatus("info", favoritesOnly ? "Показано тільки улюблені меми." : "Галерею оновлено.");
        return memes;
    } catch (error) {
        console.error("Failed to load generated memes", error);
        renderError(container, "Не вдалося завантажити галерею створених мемів.");
        setGalleryStatus("error", "Не вдалося завантажити галерею.");
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

function renderEditorTemplateSelect(templates) {
    const select = document.getElementById("editor-template-select");

    if (!select) {
        return;
    }

    const currentValue = select.value;
    clearElement(select);

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Не вибрано";
    select.append(emptyOption);

    templates.forEach((template) => {
        const option = document.createElement("option");
        option.value = String(template.id);
        option.textContent = template.categoryName
            ? `${template.title} (${template.categoryName})`
            : template.title;
        select.append(option);
    });

    select.value = Array.from(select.options).some((option) => option.value === currentValue)
        ? currentValue
        : "";
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
            createTextElement("p", template.imagePath || "Шлях до зображення не вказано.", "path-text"),
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

    const useButton = createActionButton("Використати в редакторі", "button-secondary");
    useButton.addEventListener("click", () => useTemplateInEditor(template.id));

    actions.append(useButton);
    return actions;
}

function renderGeneratedMemes(memes) {
    const container = document.getElementById("generated-memes-list");
    clearElement(container);

    if (!container) {
        return;
    }

    if (!Array.isArray(memes) || memes.length === 0) {
        const message = getFavoritesOnly()
            ? "Улюблених мемів поки немає."
            : "Поки що створених мемів немає. Створіть перший мем у редакторі.";
        container.append(createEmptyState(message));
        setGalleryStatus("info", message);
        return;
    }

    memes.forEach((meme) => {
        const card = createCard();
        card.classList.add("generated-card");
        card.append(
            createImageTile(meme.imagePath, "Зображення не знайдено", meme.title || "Створений мем"),
            createBadge(meme.isFavorite ? "Улюблений" : "Звичайний", meme.isFavorite ? "favorite" : ""),
            createTextElement("h3", meme.title || "Без назви"),
            createTextElement("p", `Джерело: ${formatSourceType(meme.sourceType)}`),
            createTextElement("p", `Шаблон: ${meme.templateTitle || "не використано"}`),
            createOptionalText("Верхній текст", meme.topText),
            createOptionalText("Нижній текст", meme.bottomText),
            createOptionalText("Ефект", formatEffectName(meme.appliedEffect)),
            createMeta([
                `Створено: ${formatDate(meme.createdAt)}`,
                meme.isFavorite ? "Улюблений" : "Не в улюблених"
            ]),
            createGeneratedMemeActions(meme)
        );
        container.append(card);
    });
}

function createGeneratedMemeActions(meme) {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    const previewButton = createActionButton("Переглянути", "button-secondary");
    previewButton.addEventListener("click", () => openMemePreview(meme));

    const downloadButton = createActionButton("Завантажити", "button-secondary");
    downloadButton.addEventListener("click", () => downloadGeneratedMeme(meme));

    const favoriteButton = createActionButton(
        meme.isFavorite ? "Прибрати з улюблених" : "В улюблені",
        meme.isFavorite ? "button-favorite-active" : "button-secondary"
    );
    favoriteButton.addEventListener("click", () => toggleGeneratedMemeFavorite(meme.id, favoriteButton));

    const deleteButton = createActionButton("Видалити", "button-danger");
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

async function handleTemplateSelection(event) {
    const templateId = Number(event.target.value);

    if (!templateId) {
        resetEditorSource();
        clearCanvas();
        setEditorStatus("Оберіть шаблон або завантажте власне зображення.", "info");
        return;
    }

    const template = cachedTemplates.find((item) => item.id === templateId);
    if (!template) {
        setEditorStatus("Шаблон не знайдено в завантаженому списку.", "error");
        return;
    }

    try {
        const image = await loadImage(template.imagePath);
        currentImage = image;
        currentSourceType = "Template";
        currentTemplateId = template.id;
        currentOriginalImagePath = null;
        clearCustomFileInput();
        setEditorStatus("Шаблон завантажено в редактор.", "success");
        renderCanvas();
    } catch (error) {
        console.error("Failed to load template image", error);
        resetEditorSource();
        clearCanvas();
        setEditorStatus("Файл шаблона не знайдено. Завантажте реальне зображення шаблона або використайте власне фото.", "error");
    }
}

async function handleCustomImageSelection(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    const validationError = validateClientImage(file);
    if (validationError) {
        setEditorStatus(validationError, "error");
        event.target.value = "";
        return;
    }

    try {
        setEditorStatus("Завантажуємо власне зображення...", "info");
        const uploaded = await uploadFile(`${API_BASE}/uploads/custom`, file);
        const image = await loadImage(uploaded.relativePath);

        currentImage = image;
        currentSourceType = "Custom";
        currentTemplateId = null;
        currentOriginalImagePath = uploaded.relativePath;

        const templateSelect = document.getElementById("editor-template-select");
        if (templateSelect) {
            templateSelect.value = "";
        }

        setEditorStatus("Власне зображення завантажено в редактор.", "success");
        renderCanvas();
    } catch (error) {
        console.error("Failed to upload custom image", error);
        setEditorStatus("Не вдалося завантажити зображення.", "error");
    }
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

function useTemplateInEditor(templateId) {
    const select = document.getElementById("editor-template-select");

    if (!select) {
        return;
    }

    select.value = String(templateId);
    select.dispatchEvent(new Event("change"));

    const editorSection = document.getElementById("editor-section");
    if (editorSection) {
        editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setEditorStatus("Шаблон обрано для редагування.", "success");
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

    const { width, height } = getCanvasSize(currentImage);
    canvas.width = width;
    canvas.height = height;

    if (emptyState) {
        emptyState.classList.add("is-hidden");
    }

    drawBaseImage(ctx, canvas, currentImage, getEditorValue("image-effect-select", "None"));
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
}

function getCanvasSize(image) {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(CANVAS_MAX_WIDTH / sourceWidth, CANVAS_MAX_HEIGHT / sourceHeight, 1);

    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale))
    };
}

function drawBaseImage(ctx, canvas, image, effect) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = effect === "Blur" ? "blur(2px)" : "none";

    if (effect === "Shakal") {
        drawShakalizedImage(ctx, canvas, image);
    } else {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    ctx.filter = "none";

    if (effect === "Grayscale" || effect === "Contrast" || effect === "Red") {
        applyPixelEffect(ctx, canvas, effect);
    }
}

function drawShakalizedImage(ctx, canvas, image) {
    const smallCanvas = document.createElement("canvas");
    const smallCtx = smallCanvas.getContext("2d");
    smallCanvas.width = Math.max(24, Math.round(canvas.width / 8));
    smallCanvas.height = Math.max(24, Math.round(canvas.height / 8));

    smallCtx.imageSmoothingEnabled = false;
    smallCtx.drawImage(image, 0, 0, smallCanvas.width, smallCanvas.height);

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

    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.fillStyle = textColor;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(3, Math.round(fontSize / 12));

    if (position === "TopAndBottom") {
        drawWrappedText(ctx, topText, canvas.width / 2, padding, maxWidth, lineHeight, "top");
        drawWrappedText(ctx, bottomText, canvas.width / 2, canvas.height - padding, maxWidth, lineHeight, "bottom");
    } else if (position === "Top") {
        drawWrappedText(ctx, topText || bottomText, canvas.width / 2, padding, maxWidth, lineHeight, "top");
    } else if (position === "Center") {
        drawWrappedText(ctx, [topText, bottomText].filter(Boolean).join(" "), canvas.width / 2, canvas.height / 2, maxWidth, lineHeight, "center");
    } else if (position === "Bottom") {
        drawWrappedText(ctx, bottomText || topText, canvas.width / 2, canvas.height - padding, maxWidth, lineHeight, "bottom");
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

function downloadCanvasMeme() {
    if (!currentImage) {
        setEditorStatus("Спочатку оберіть або завантажте зображення.", "error");
        return;
    }

    renderCanvas();

    const canvas = document.getElementById("meme-canvas");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "memoid-meme.png";
    link.click();
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
        await loadGeneratedMemes(getFavoritesOnly());
        if (getFavoritesOnly()) {
            setGalleryStatus("success", "Мем збережено, але фільтр показує тільки улюблені. Вимкніть фільтр, щоб побачити новий мем.");
        }
    } catch (error) {
        console.error("Failed to save generated meme", error);
        setEditorStatus("Не вдалося зберегти мем.", "error");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
        }
    }
}

function buildGeneratedMemePayload(imagePath) {
    const sourceType = currentSourceType === "Template" ? "Template" : "Custom";

    return {
        title: getEditorValue("meme-title-input", "").trim() || "Без назви",
        imagePath,
        sourceType,
        memeTemplateId: sourceType === "Template" ? currentTemplateId : null,
        originalImagePath: sourceType === "Custom" ? currentOriginalImagePath : null,
        topText: getEditorValue("top-text-input", "").trim() || null,
        bottomText: getEditorValue("bottom-text-input", "").trim() || null,
        textPosition: getEditorValue("text-position-select", "TopAndBottom"),
        fontFamily: getEditorValue("font-family-select", "Arial"),
        fontSize: Number(getEditorValue("font-size-input", "48")),
        textColor: getEditorValue("text-color-input", "#ffffff"),
        textBackgroundColor: null,
        appliedEffect: getEditorValue("image-effect-select", "None")
    };
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
    meta.textContent = [
        `Джерело: ${formatSourceType(meme.sourceType)}`,
        meme.templateTitle ? `шаблон: ${meme.templateTitle}` : null,
        `створено: ${formatDate(meme.createdAt)}`,
        meme.appliedEffect ? `ефект: ${formatEffectName(meme.appliedEffect)}` : null
    ].filter(Boolean).join(" · ");

    text.textContent = [
        meme.topText ? `Верхній текст: ${meme.topText}` : null,
        meme.bottomText ? `Нижній текст: ${meme.bottomText}` : null
    ].filter(Boolean).join(" | ");

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

function setApiStatus(type, message) {
    const badge = document.getElementById("api-status-badge");
    const statusMessage = document.getElementById("api-status-message");
    const className = `status-${type}`;

    if (badge) {
        badge.classList.remove("status-loading", "status-success", "status-error");
        badge.classList.add(className);
        badge.textContent = type === "success"
            ? "Web API підключено"
            : type === "error"
                ? "Є проблема з API"
                : "Підключення до Web API...";
    }

    if (statusMessage) {
        statusMessage.classList.remove("status-loading", "status-success", "status-error");
        statusMessage.classList.add(className);
        statusMessage.textContent = message;
    }
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
}

function clearCustomFileInput() {
    const input = document.getElementById("custom-image-input");
    if (input) {
        input.value = "";
    }
}

function getEditorValue(id, fallback) {
    const element = document.getElementById(id);
    return element ? element.value : fallback;
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
    const effects = {
        None: "Без ефекту",
        Grayscale: "Чорно-білий",
        Contrast: "Контраст",
        Red: "Червоний фільтр",
        Blur: "Легке розмиття",
        Shakal: "Шакалізація"
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
