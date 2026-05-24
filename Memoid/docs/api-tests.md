# Memoid: ручне тестування Web API

Базова адреса для локального запуску:

```text
https://localhost:7113
```

API проєкту **Memoid** тестується через HTTP-запити. `GET`-запити можна швидко перевірити прямо в браузері, а `POST`, `PUT`, `PATCH` і `DELETE` зручніше виконувати через Postman, `.http` файл у Visual Studio / VS Code REST Client або інший HTTP-клієнт.

OpenAPI JSON доступний за адресою:

```text
https://localhost:7113/openapi/v1.json
```

## Загальні очікування

- Відповіді API повертаються у форматі JSON.
- Помилки валідації повертають `400 Bad Request`.
- Якщо запис не знайдено, очікується `404 Not Found`.
- Створення нового запису повертає `201 Created`.
- Успішне оновлення або видалення повертає `204 No Content`.
- Фізичні файли зображень поки не завантажуються і не видаляються. API працює тільки з метаданими.

## MemeCategoriesController

Маршрут контролера:

```text
/api/meme-categories
```

### Чеклист

- Отримати всі активні категорії.
- Отримати категорію за `id`.
- Створити нову категорію.
- Перевірити заборону дублювання назви.
- Перевірити заборону порожньої назви.
- Оновити категорію.
- Видалити категорію або безпечно деактивувати її, якщо в ній є шаблони.

### A. GET all categories

```http
GET https://localhost:7113/api/meme-categories
```

Очікується:

- `200 OK`
- JSON-масив категорій.

### B. GET category by id

```http
GET https://localhost:7113/api/meme-categories/1
```

Очікується:

- `200 OK`, якщо категорія існує.
- `404 Not Found`, якщо категорію не знайдено.

### C. POST create category

```http
POST https://localhost:7113/api/meme-categories
Content-Type: application/json

{
  "name": "Тестова категорія",
  "description": "Категорія для ручного тестування API"
}
```

Очікується:

- `201 Created`
- У відповіді повертається створена категорія.

### D. POST duplicate category name

Повторити запит створення категорії з тією самою назвою.

Очікується:

- `400 Bad Request`
- Повідомлення про те, що категорія з такою назвою вже існує.

### E. POST empty category name

```http
POST https://localhost:7113/api/meme-categories
Content-Type: application/json

{
  "name": "   ",
  "description": "Некоректна категорія"
}
```

Очікується:

- `400 Bad Request`
- Повідомлення про порожню назву категорії.

### F. PUT update category

Замініть `{id}` на id створеної категорії.

```http
PUT https://localhost:7113/api/meme-categories/{id}
Content-Type: application/json

{
  "name": "Оновлена тестова категорія",
  "description": "Оновлений опис категорії",
  "isActive": true
}
```

Очікується:

- `204 No Content`
- Категорія оновлена.

### G. DELETE category

Замініть `{id}` на id категорії.

```http
DELETE https://localhost:7113/api/meme-categories/{id}
```

Очікується:

- `204 No Content`
- Якщо категорія не має шаблонів, запис може бути видалений.
- Якщо категорія має шаблони, API безпечно встановлює `isActive = false`.

## MemeTemplatesController

Маршрут контролера:

```text
/api/meme-templates
```

### Чеклист

- Отримати всі активні шаблони.
- Відфільтрувати шаблони за категорією.
- Отримати шаблон за `id`.
- Створити шаблон із правильним шляхом зображення.
- Перевірити помилку для неправильного шляху зображення.
- Перевірити помилку для неіснуючої категорії.
- Оновити шаблон.
- Видалити шаблон або безпечно деактивувати його, якщо з ним пов'язані створені меми.

### A. GET all templates

```http
GET https://localhost:7113/api/meme-templates
```

Очікується:

- `200 OK`
- JSON-масив шаблонів.

### B. GET templates by category

```http
GET https://localhost:7113/api/meme-templates?categoryId=1
```

Очікується:

- `200 OK`
- JSON-масив шаблонів тільки для категорії з `id = 1`.

### C. GET template by id

```http
GET https://localhost:7113/api/meme-templates/1
```

Очікується:

- `200 OK`, якщо шаблон існує.
- `404 Not Found`, якщо шаблон не знайдено.

### D. POST create template

```http
POST https://localhost:7113/api/meme-templates
Content-Type: application/json

{
  "title": "Тестовий шаблон",
  "imagePath": "/uploads/templates/test-template.png",
  "memeCategoryId": 1
}
```

Очікується:

- `201 Created`
- У відповіді повертається створений шаблон.

### E. POST template with invalid image path

```http
POST https://localhost:7113/api/meme-templates
Content-Type: application/json

{
  "title": "Некоректний шаблон",
  "imagePath": "/wrong-folder/test-template.png",
  "memeCategoryId": 1
}
```

Очікується:

- `400 Bad Request`
- Повідомлення про неправильний шлях до зображення.

### F. POST template with non-existing category

```http
POST https://localhost:7113/api/meme-templates
Content-Type: application/json

{
  "title": "Шаблон без категорії",
  "imagePath": "/uploads/templates/no-category.png",
  "memeCategoryId": 999999
}
```

Очікується:

- `400 Bad Request`
- Повідомлення про відсутню активну категорію.

### G. PUT update template

Замініть `{id}` на id створеного шаблону.

```http
PUT https://localhost:7113/api/meme-templates/{id}
Content-Type: application/json

{
  "title": "Оновлений тестовий шаблон",
  "imagePath": "/uploads/templates/test-template-updated.png",
  "memeCategoryId": 1,
  "isActive": true
}
```

Очікується:

- `204 No Content`
- Шаблон оновлено.

### H. DELETE template

Замініть `{id}` на id шаблону.

```http
DELETE https://localhost:7113/api/meme-templates/{id}
```

Очікується:

- `204 No Content`
- Якщо шаблон не має створених мемів, запис може бути видалений.
- Якщо шаблон має створені меми, API безпечно встановлює `isActive = false`.

## GeneratedMemesController

Маршрут контролера:

```text
/api/generated-memes
```

### Чеклист

- Отримати всі створені меми.
- Отримати тільки улюблені меми.
- Відфільтрувати створені меми за шаблоном.
- Отримати створений мем за `id`.
- Створити запис метаданих створеного мема.
- Перевірити помилку для неправильного `sourceType`.
- Перевірити помилку для неправильного `imagePath`.
- Оновити назву та статус улюбленого.
- Перемкнути статус улюбленого через `PATCH`.
- Видалити запис створеного мема.

### A. GET all generated memes

```http
GET https://localhost:7113/api/generated-memes
```

Очікується:

- `200 OK`
- JSON-масив створених мемів. Якщо записів немає, повертається порожній масив.

### B. GET only favorites

```http
GET https://localhost:7113/api/generated-memes?favoritesOnly=true
```

Очікується:

- `200 OK`
- JSON-масив тільки улюблених мемів.

### C. GET by template

```http
GET https://localhost:7113/api/generated-memes?templateId=1
```

Очікується:

- `200 OK`
- JSON-масив мемів, створених на основі шаблону з `id = 1`.

### D. GET generated meme by id

```http
GET https://localhost:7113/api/generated-memes/1
```

Очікується:

- `200 OK`, якщо створений мем існує.
- `404 Not Found`, якщо створений мем не знайдено.

### E. POST create generated meme metadata

```http
POST https://localhost:7113/api/generated-memes
Content-Type: application/json

{
  "title": "Тестовий створений мем",
  "imagePath": "/uploads/generated/test-generated-meme.png",
  "sourceType": "Template",
  "memeTemplateId": 1,
  "originalImagePath": null,
  "topText": "Коли лабораторна",
  "bottomText": "нарешті запускається",
  "textPosition": "TopAndBottom",
  "fontFamily": "Arial",
  "fontSize": 48,
  "textColor": "#ffffff",
  "textBackgroundColor": null,
  "appliedEffect": "None"
}
```

Очікується:

- `201 Created`
- Створюється тільки запис метаданих. Файл зображення не завантажується.

### F. POST generated meme with invalid sourceType

```http
POST https://localhost:7113/api/generated-memes
Content-Type: application/json

{
  "title": "Некоректний тип джерела",
  "imagePath": "/uploads/generated/invalid-source.png",
  "sourceType": "Unknown",
  "memeTemplateId": 1,
  "originalImagePath": null,
  "topText": "Test",
  "bottomText": "Test",
  "textPosition": "TopAndBottom",
  "fontFamily": "Arial",
  "fontSize": 48,
  "textColor": "#ffffff",
  "textBackgroundColor": null,
  "appliedEffect": "None"
}
```

Очікується:

- `400 Bad Request`

### G. POST generated meme with invalid imagePath

```http
POST https://localhost:7113/api/generated-memes
Content-Type: application/json

{
  "title": "Некоректний шлях",
  "imagePath": "/wrong-folder/generated.png",
  "sourceType": "Template",
  "memeTemplateId": 1,
  "originalImagePath": null,
  "topText": "Test",
  "bottomText": "Test",
  "textPosition": "TopAndBottom",
  "fontFamily": "Arial",
  "fontSize": 48,
  "textColor": "#ffffff",
  "textBackgroundColor": null,
  "appliedEffect": "None"
}
```

Очікується:

- `400 Bad Request`

### H. PUT update generated meme

Замініть `{id}` на id створеного мема.

```http
PUT https://localhost:7113/api/generated-memes/{id}
Content-Type: application/json

{
  "title": "Оновлена назва тестового мема",
  "isFavorite": true
}
```

Очікується:

- `204 No Content`

### I. PATCH toggle favorite

Замініть `{id}` на id створеного мема.

```http
PATCH https://localhost:7113/api/generated-memes/{id}/favorite
```

Очікується:

- `200 OK`
- У відповіді повертається оновлений об'єкт зі зміненим `isFavorite`.

### J. DELETE generated meme

Замініть `{id}` на id створеного мема.

```http
DELETE https://localhost:7113/api/generated-memes/{id}
```

Очікується:

- `204 No Content`
- Видаляється тільки запис у базі даних. Фізичний файл не видаляється.

