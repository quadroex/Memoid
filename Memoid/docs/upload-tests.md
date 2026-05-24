# Memoid: тестування завантаження зображень

Базова адреса локального API:

```text
https://localhost:7113
```

У цьому етапі API завантажує файли зображень у папку `wwwroot/uploads` і повертає публічний відносний шлях. Бінарні дані не записуються в базу даних. У майбутніх етапах у базі будуть зберігатися тільки шляхи до файлів, наприклад `/uploads/custom/{file-name}.png`.

## Обмеження

Дозволені розширення:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Дозволені `Content-Type`:

- `image/jpeg`
- `image/png`
- `image/webp`

Максимальний розмір файлу:

```text
5 МБ
```

Оригінальна назва файлу не використовується як фінальна назва. API генерує безпечну назву через `Guid` і залишає тільки дозволене розширення.

## UploadsController

Маршрут контролера:

```text
/api/uploads
```

Усі запити використовують `multipart/form-data`. Назва поля форми:

```text
file
```

## POST /api/uploads/templates

Призначення: завантаження зображення шаблону мема.

Файл зберігається у:

```text
wwwroot/uploads/templates
```

Приклад:

```http
POST https://localhost:7113/api/uploads/templates
Content-Type: multipart/form-data
```

Очікується:

- `201 Created`
- JSON з метаданими файлу.
- `relativePath` починається з `/uploads/templates/`.

## POST /api/uploads/custom

Призначення: завантаження власного початкового зображення користувача.

Файл зберігається у:

```text
wwwroot/uploads/custom
```

Очікується:

- `201 Created`
- JSON з метаданими файлу.
- `relativePath` починається з `/uploads/custom/`.

## POST /api/uploads/generated

Призначення: завантаження фінального згенерованого мема.

Файл зберігається у:

```text
wwwroot/uploads/generated
```

Очікується:

- `201 Created`
- JSON з метаданими файлу.
- `relativePath` починається з `/uploads/generated/`.

## Приклад успішної відповіді

```json
{
  "fileName": "b6d3f21a1f124a7ca387cf956a1efb0c.png",
  "relativePath": "/uploads/custom/b6d3f21a1f124a7ca387cf956a1efb0c.png",
  "contentType": "image/png",
  "size": 123456
}
```

Після успішного завантаження файл можна відкрити в браузері:

```text
https://localhost:7113/uploads/custom/b6d3f21a1f124a7ca387cf956a1efb0c.png
```

## Очікувані помилки

Якщо файл не передано:

```text
400 Bad Request
Файл не було передано.
```

Якщо файл порожній:

```text
400 Bad Request
Файл порожній.
```

Якщо розмір файлу більший за 5 МБ:

```text
400 Bad Request
Розмір файлу перевищує дозволені 5 МБ.
```

Якщо формат не підтримується:

```text
400 Bad Request
Непідтримуваний тип файлу. Дозволені формати: JPG, PNG, WEBP.
```

## Як тестувати через .http файл

1. Відкрити файл `http/memoid-upload-tests.http`.
2. Замінити `./sample.png` на шлях до реального локального зображення.
3. Запустити проєкт на `https://localhost:7113`.
4. Виконати потрібний запит у Visual Studio або VS Code REST Client.
5. Скопіювати `relativePath` з відповіді та відкрити його в браузері разом із базовою адресою.

## Як тестувати через Postman

1. Створити `POST` запит на один із маршрутів:
   - `https://localhost:7113/api/uploads/templates`
   - `https://localhost:7113/api/uploads/custom`
   - `https://localhost:7113/api/uploads/generated`
2. Відкрити вкладку `Body`.
3. Вибрати `form-data`.
4. Додати поле з назвою `file`.
5. Для поля `file` вибрати тип `File`.
6. Обрати локальний файл `.jpg`, `.jpeg`, `.png` або `.webp`.
7. Надіслати запит.

Postman автоматично сформує `multipart/form-data` тіло запиту.

