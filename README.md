# Memoid

Memoid - навчальний вебзастосунок для створення мемів на основі шаблонів і власних зображень. Backend реалізовано як ASP.NET Core Web API, а frontend - як статичні HTML, CSS і JavaScript-файли з використанням HTML5 Canvas.

## Технології

- C# / .NET 10.0
- ASP.NET Core Web API
- Entity Framework Core Code First
- PostgreSQL
- HTML, CSS, JavaScript
- HTML5 Canvas

## Локальний запуск

Основна адреса застосунку:

```text
https://localhost:7113
```

OpenAPI JSON:

```text
https://localhost:7113/openapi/v1.json
```

## База даних

Проєкт використовує PostgreSQL.

- Назва бази даних: `memoid_db`
- Локальний порт PostgreSQL у цьому проєкті: `5433`
- Рядок підключення зберігається у `Memoid/appsettings.Development.json`
- Безпечний приклад налаштувань є у `Memoid/appsettings.Development.example.json`

Не додавайте реальний пароль до README або інших файлів, які комітяться у Git.

## Основні можливості

- керування категоріями мемів;
- створення шаблонів із завантаженням зображень;
- завантаження власних зображень;
- canvas-редактор мемів;
- верхній і нижній текст;
- налаштування шрифту, розміру, кольору та позиції тексту;
- ефекти зображення;
- шакалізація;
- прості режими кадрування: оригінальні пропорції, вписати повністю, заповнити полотно, квадратний мем;
- збереження створених мемів;
- галерея створених мемів;
- перегляд, завантаження, улюблені та видалення мемів.

## Як запустити проєкт

1. Перейти в папку проєкту:

```bash
cd Memoid
```

2. Відновити NuGet-пакети:

```bash
dotnet restore
```

3. Перевірити `appsettings.Development.json` і за потреби створити його на основі:

```text
Memoid/appsettings.Development.example.json
```

4. Якщо база ще не оновлена, застосувати міграції:

```bash
dotnet ef database update
```

5. Запустити застосунок:

```bash
dotnet run
```

6. Відкрити у браузері:

```text
https://localhost:7113
```

## Основні API endpoints

### MemeCategoriesController

- `GET /api/meme-categories`
- `GET /api/meme-categories/{id}`
- `POST /api/meme-categories`
- `PUT /api/meme-categories/{id}`
- `DELETE /api/meme-categories/{id}`

### MemeTemplatesController

- `GET /api/meme-templates`
- `GET /api/meme-templates/{id}`
- `POST /api/meme-templates`
- `PUT /api/meme-templates/{id}`
- `DELETE /api/meme-templates/{id}`

### GeneratedMemesController

- `GET /api/generated-memes`
- `GET /api/generated-memes/{id}`
- `POST /api/generated-memes`
- `PUT /api/generated-memes/{id}`
- `PATCH /api/generated-memes/{id}/favorite`
- `DELETE /api/generated-memes/{id}`

### UploadsController

- `POST /api/uploads/templates`
- `POST /api/uploads/custom`
- `POST /api/uploads/generated`

## Зберігання файлів

Завантажені зображення зберігаються у `Memoid/wwwroot/uploads`:

- `uploads/templates` - зображення шаблонів;
- `uploads/custom` - власні вихідні зображення користувача;
- `uploads/generated` - готові створені меми.

У базі даних зберігаються лише шляхи до файлів і метадані, а не binary-вміст зображень.
