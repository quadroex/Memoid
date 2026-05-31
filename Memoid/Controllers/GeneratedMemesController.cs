using Memoid.Data;
using Memoid.DTOs;
using Memoid.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Controllers;

/// <summary>
/// API для галереї мемів.
/// </summary>
[ApiController]
[Tags("Generated Memes")]
[Route("api/generated-memes")]
public class GeneratedMemesController : ControllerBase
{
    private const string SourceTypeTemplate = "Template";
    private const string SourceTypeCustom = "Custom";
    private const string GeneratedImagePathPrefix = "/uploads/generated/";
    private const string CustomImagePathPrefix = "/uploads/custom/";
    private const int GeneratedMemeTitleMinLength = 3;
    private const int GeneratedMemeTitleMaxLength = 20;

    private readonly MemoidDbContext _context;

    public GeneratedMemesController(MemoidDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Повертає всі створені меми.
    /// </summary>
    /// <param name="favoritesOnly">Якщо true, повертає тільки улюблені меми.</param>
    /// <param name="templateId">Фільтр за шаблономм, за яким створено мем.</param>
    /// <returns>Список мемів.</returns>
    [ProducesResponseType(typeof(IEnumerable<GeneratedMemeDto>), StatusCodes.Status200OK)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GeneratedMemeDto>>> GetGeneratedMemes(
        bool favoritesOnly = false,
        int? templateId = null)
    {
        var query = _context.GeneratedMemes.AsNoTracking();

        if (favoritesOnly)
        {
            query = query.Where(meme => meme.IsFavorite);
        }

        if (templateId.HasValue)
        {
            query = query.Where(meme => meme.MemeTemplateId == templateId.Value);
        }

        var memes = await query
            .OrderByDescending(meme => meme.CreatedAt)
            .Select(meme => ToDto(meme, meme.MemeTemplate == null ? null : meme.MemeTemplate.Title))
            .ToListAsync();

        return Ok(memes);
    }

    /// <summary>
    /// Повертає створений мем за id.
    /// </summary>
    /// <param name="id">Id мема.</param>
    /// <returns>Дані мема.</returns>
    [ProducesResponseType(typeof(GeneratedMemeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<GeneratedMemeDto>> GetGeneratedMeme(int id)
    {
        var meme = await _context.GeneratedMemes
            .AsNoTracking()
            .Where(meme => meme.Id == id)
            .Select(meme => ToDto(meme, meme.MemeTemplate == null ? null : meme.MemeTemplate.Title))
            .FirstOrDefaultAsync();

        if (meme is null)
        {
            return NotFound("Створений мем не знайдено.");
        }

        return Ok(meme);
    }

    /// <summary>
    /// Створює запис для готового мема.
    /// </summary>
    /// <param name="request">Метадані створеного мема та шлях до зображення.</param>
    /// <returns>Створений мем.</returns>
    [ProducesResponseType(typeof(GeneratedMemeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [HttpPost]
    public async Task<ActionResult<GeneratedMemeDto>> CreateGeneratedMeme(CreateGeneratedMemeDto request)
    {
        var validationError = await ValidateGeneratedMemeAsync(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var sourceType = NormalizeSourceType(request.SourceType);

        var meme = new GeneratedMeme
        {
            Title = NormalizeRequiredText(request.Title),
            ImagePath = NormalizeRequiredText(request.ImagePath),
            SourceType = sourceType,
            MemeTemplateId = sourceType == SourceTypeTemplate ? request.MemeTemplateId : null,
            OriginalImagePath = NormalizeOptionalText(request.OriginalImagePath),
            TopText = NormalizeOptionalText(request.TopText),
            BottomText = NormalizeOptionalText(request.BottomText),
            TextPosition = NormalizeRequiredText(request.TextPosition),
            FontFamily = NormalizeRequiredText(request.FontFamily),
            FontSize = request.FontSize,
            TextColor = NormalizeRequiredText(request.TextColor),
            TextBackgroundColor = NormalizeOptionalText(request.TextBackgroundColor),
            AppliedEffect = NormalizeOptionalText(request.AppliedEffect)
        };

        _context.GeneratedMemes.Add(meme);
        await _context.SaveChangesAsync();

        var dto = await GetGeneratedMemeDtoAsync(meme.Id);

        return CreatedAtAction(nameof(GetGeneratedMeme), new { id = meme.Id }, dto);
    }

    /// <summary>
    /// Оновлює назву мема та статус улюбленого.
    /// </summary>
    /// <param name="id">Id мема.</param>
    /// <param name="request">Оновлений мем.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateGeneratedMeme(int id, UpdateGeneratedMemeDto request)
    {
        var meme = await _context.GeneratedMemes.FindAsync(id);
        if (meme is null)
        {
            return NotFound("Створений мем не знайдено.");
        }

        var title = NormalizeRequiredText(request.Title);
        var titleValidationError = ValidateGeneratedMemeTitle(title);
        if (titleValidationError is not null)
        {
            return BadRequest(titleValidationError);
        }

        meme.Title = title;
        meme.IsFavorite = request.IsFavorite;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Перемикає статус улюбленого.
    /// </summary>
    /// <param name="id">Id мема.</param>
    /// <returns>Оновлений мем.</returns>
    [ProducesResponseType(typeof(GeneratedMemeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpPatch("{id:int}/favorite")]
    public async Task<ActionResult<GeneratedMemeDto>> ToggleFavorite(int id)
    {
        var meme = await _context.GeneratedMemes.FindAsync(id);
        if (meme is null)
        {
            return NotFound("Створений мем не знайдено.");
        }

        meme.IsFavorite = !meme.IsFavorite;
        await _context.SaveChangesAsync();

        var dto = await GetGeneratedMemeDtoAsync(id);

        return Ok(dto);
    }

    /// <summary>
    /// Видаляє мем.
    /// </summary>
    /// <param name="id">Id мема.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteGeneratedMeme(int id)
    {
        var meme = await _context.GeneratedMemes.FindAsync(id);
        if (meme is null)
        {
            return NotFound("Створений мем не знайдено.");
        }

        _context.GeneratedMemes.Remove(meme);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<GeneratedMemeDto?> GetGeneratedMemeDtoAsync(int id)
    {
        return await _context.GeneratedMemes
            .AsNoTracking()
            .Where(meme => meme.Id == id)
            .Select(meme => ToDto(meme, meme.MemeTemplate == null ? null : meme.MemeTemplate.Title))
            .FirstOrDefaultAsync();
    }

    private async Task<string?> ValidateGeneratedMemeAsync(CreateGeneratedMemeDto request)
    {
        var title = NormalizeRequiredText(request.Title);
        var titleValidationError = ValidateGeneratedMemeTitle(title);
        if (titleValidationError is not null)
        {
            return titleValidationError;
        }

        if (string.IsNullOrWhiteSpace(request.ImagePath))
        {
            return "Шлях до зображення не може бути порожнім.";
        }

        var imagePath = NormalizeRequiredText(request.ImagePath);

        if (imagePath.Length > 500)
        {
            return "Шлях до зображення не може бути довшим за 500 символів.";
        }

        if (!IsValidGeneratedImagePath(imagePath))
        {
            return "Неправильний шлях до зображення. Шлях має починатися з /uploads/generated/.";
        }

        var sourceType = NormalizeSourceType(request.SourceType);
        if (sourceType is not SourceTypeTemplate and not SourceTypeCustom)
        {
            return "Тип джерела має бути Template або Custom.";
        }

        if (sourceType == SourceTypeTemplate)
        {
            if (!request.MemeTemplateId.HasValue)
            {
                return "Для мема на основі шаблону потрібно вказати MemeTemplateId.";
            }

            var templateExists = await _context.MemeTemplates.AnyAsync(template =>
                template.Id == request.MemeTemplateId.Value && template.IsActive);

            if (!templateExists)
            {
                return "Активний шаблон для створеного мема не знайдено.";
            }
        }

        var originalImagePath = NormalizeOptionalText(request.OriginalImagePath);
        if (originalImagePath is not null && originalImagePath.Length > 500)
        {
            return "Шлях до оригінального зображення не може бути довшим за 500 символів.";
        }

        if (originalImagePath is not null && !IsValidCustomImagePath(originalImagePath))
        {
            return "Неправильний шлях до оригінального зображення. Шлях має починатися з /uploads/custom/.";
        }

        if (NormalizeOptionalText(request.TopText)?.Length > 200)
        {
            return "Верхній текст не може бути довшим за 200 символів.";
        }

        if (NormalizeOptionalText(request.BottomText)?.Length > 200)
        {
            return "Нижній текст не може бути довшим за 200 символів.";
        }

        if (string.IsNullOrWhiteSpace(request.TextPosition))
        {
            return "Позиція тексту не може бути порожньою.";
        }

        if (NormalizeRequiredText(request.TextPosition).Length > 40)
        {
            return "Позиція тексту не може бути довшою за 40 символів.";
        }

        if (string.IsNullOrWhiteSpace(request.FontFamily))
        {
            return "Назва шрифту не може бути порожньою.";
        }

        if (NormalizeRequiredText(request.FontFamily).Length > 80)
        {
            return "Назва шрифту не може бути довшою за 80 символів.";
        }

        if (request.FontSize is < 12 or > 120)
        {
            return "Розмір шрифту має бути від 12 до 120.";
        }

        if (string.IsNullOrWhiteSpace(request.TextColor))
        {
            return "Колір тексту не може бути порожнім.";
        }

        if (NormalizeRequiredText(request.TextColor).Length > 30)
        {
            return "Колір тексту не може бути довшим за 30 символів.";
        }

        if (NormalizeOptionalText(request.TextBackgroundColor)?.Length > 30)
        {
            return "Колір фону тексту не може бути довшим за 30 символів.";
        }

        if (NormalizeOptionalText(request.AppliedEffect)?.Length > 80)
        {
            return "Назва ефекту не може бути довшою за 80 символів.";
        }

        return null;
    }

    private static GeneratedMemeDto ToDto(GeneratedMeme meme, string? templateTitle)
    {
        return new GeneratedMemeDto
        {
            Id = meme.Id,
            Title = meme.Title,
            ImagePath = meme.ImagePath,
            SourceType = meme.SourceType,
            MemeTemplateId = meme.MemeTemplateId,
            TemplateTitle = templateTitle,
            OriginalImagePath = meme.OriginalImagePath,
            TopText = meme.TopText,
            BottomText = meme.BottomText,
            TextPosition = meme.TextPosition,
            FontFamily = meme.FontFamily,
            FontSize = meme.FontSize,
            TextColor = meme.TextColor,
            TextBackgroundColor = meme.TextBackgroundColor,
            AppliedEffect = meme.AppliedEffect,
            IsFavorite = meme.IsFavorite,
            CreatedAt = meme.CreatedAt
        };
    }

    private static string NormalizeSourceType(string? value)
    {
        var sourceType = NormalizeRequiredText(value);

        if (sourceType.Equals(SourceTypeTemplate, StringComparison.OrdinalIgnoreCase))
        {
            return SourceTypeTemplate;
        }

        if (sourceType.Equals(SourceTypeCustom, StringComparison.OrdinalIgnoreCase))
        {
            return SourceTypeCustom;
        }

        return sourceType;
    }

    private static bool IsValidGeneratedImagePath(string imagePath)
    {
        return imagePath.StartsWith(GeneratedImagePathPrefix, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsValidCustomImagePath(string imagePath)
    {
        return imagePath.StartsWith(CustomImagePathPrefix, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeRequiredText(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private static string? ValidateGeneratedMemeTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "Вкажіть назву мема.";
        }

        if (title.Length is < GeneratedMemeTitleMinLength or > GeneratedMemeTitleMaxLength)
        {
            return "Назва мема має містити від 3 до 20 символів.";
        }

        return null;
    }
}
