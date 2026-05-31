using Memoid.Data;
using Memoid.DTOs;
using Memoid.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Memoid.Controllers;

/// <summary>
/// API для шаблонів.
/// </summary>
[ApiController]
[Tags("Meme Templates")]
[Route("api/meme-templates")]
public class MemeTemplatesController : ControllerBase
{
    private const string TemplateImagePathPrefix = "/uploads/templates/";

    private readonly MemoidDbContext _context;

    public MemeTemplatesController(MemoidDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Повертає шаблони мемів з optional фільтром за категорією.
    /// </summary>
    /// <param name="categoryId">id категорії для фільтрації.</param>
    /// <param name="includeInactive">якщо true, додає неактивні шаблони.</param>
    /// <returns>шаблони із назвою категорії та кількістю мемів.</returns>
    [ProducesResponseType(typeof(IEnumerable<MemeTemplateDto>), StatusCodes.Status200OK)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MemeTemplateDto>>> GetTemplates(
        int? categoryId = null,
        bool includeInactive = false)
    {
        var query = _context.MemeTemplates.AsNoTracking();

        if (categoryId.HasValue)
        {
            query = query.Where(template => template.MemeCategoryId == categoryId.Value);
        }

        if (!includeInactive)
        {
            query = query.Where(template => template.IsActive);
        }

        var templates = await query
            .OrderBy(template => template.Title)
            .Select(template => ToDto(
                template,
                template.MemeCategory == null ? null : template.MemeCategory.Name,
                template.GeneratedMemes.Count))
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// Повертає один шаблон за id.
    /// </summary>
    /// <param name="id">Id шаблона.</param>
    /// <returns>Дані шаблона.</returns>
    [ProducesResponseType(typeof(MemeTemplateDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<MemeTemplateDto>> GetTemplate(int id)
    {
        var template = await _context.MemeTemplates
            .AsNoTracking()
            .Where(template => template.Id == id)
            .Select(template => ToDto(
                template,
                template.MemeCategory == null ? null : template.MemeCategory.Name,
                template.GeneratedMemes.Count))
            .FirstOrDefaultAsync();

        if (template is null)
        {
            return NotFound("Шаблон не знайдено.");
        }

        return Ok(template);
    }

    /// <summary>
    /// Створює новий шаблон на основі зображення.
    /// </summary>
    /// <param name="request">Назва, шлях до зображення та категорія шаблона.</param>
    /// <returns>Створений шаблон.</returns>
    [ProducesResponseType(typeof(MemeTemplateDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [HttpPost]
    public async Task<ActionResult<MemeTemplateDto>> CreateTemplate(CreateMemeTemplateDto request)
    {
        var validationError = ValidateTemplate(request.Title, request.ImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (!await ActiveCategoryExistsAsync(request.MemeCategoryId))
        {
            return BadRequest("Активну категорію для шаблону не знайдено.");
        }

        var title = NormalizeRequiredText(request.Title);
        var imagePath = NormalizeRequiredText(request.ImagePath);

        if (await TemplateTitleExistsAsync(title))
        {
            return BadRequest("Шаблон з такою назвою вже існує.");
        }

        var template = new MemeTemplate
        {
            Title = title,
            ImagePath = imagePath,
            MemeCategoryId = request.MemeCategoryId
        };

        _context.MemeTemplates.Add(template);
        await _context.SaveChangesAsync();

        var dto = await GetTemplateDtoAsync(template.Id);

        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, dto);
    }

    /// <summary>
    /// Оновлює назву, шлях до зображення, категорію та статус шаблона.
    /// </summary>
    /// <param name="id">Id шаблона.</param>
    /// <param name="request">Нові дані шаблона.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTemplate(int id, UpdateMemeTemplateDto request)
    {
        var template = await _context.MemeTemplates.FindAsync(id);
        if (template is null)
        {
            return NotFound("Шаблон не знайдено.");
        }

        var validationError = ValidateTemplate(request.Title, request.ImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        if (!await ActiveCategoryExistsAsync(request.MemeCategoryId))
        {
            return BadRequest("Активну категорію для шаблону не знайдено.");
        }

        var title = NormalizeRequiredText(request.Title);
        var imagePath = NormalizeRequiredText(request.ImagePath);

        if (await TemplateTitleExistsAsync(title, id))
        {
            return BadRequest("Шаблон з такою назвою вже існує.");
        }

        template.Title = title;
        template.ImagePath = imagePath;
        template.MemeCategoryId = request.MemeCategoryId;
        template.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Видаляє шаблон або деактивує його, якщо з ним вже створено меми.
    /// </summary>
    /// <param name="id">Id шаблона.</param>
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var template = await _context.MemeTemplates.FindAsync(id);
        if (template is null)
        {
            return NotFound("Шаблон не знайдено.");
        }

        var hasGeneratedMemes = await _context.GeneratedMemes.AnyAsync(meme => meme.MemeTemplateId == id);

        if (hasGeneratedMemes)
        {
            template.IsActive = false;
        }
        else
        {
            _context.MemeTemplates.Remove(template);
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<MemeTemplateDto?> GetTemplateDtoAsync(int id)
    {
        return await _context.MemeTemplates
            .AsNoTracking()
            .Where(template => template.Id == id)
            .Select(template => ToDto(
                template,
                template.MemeCategory == null ? null : template.MemeCategory.Name,
                template.GeneratedMemes.Count))
            .FirstOrDefaultAsync();
    }

    private async Task<bool> ActiveCategoryExistsAsync(int categoryId)
    {
        return await _context.MemeCategories.AnyAsync(category => category.Id == categoryId && category.IsActive);
    }

    private async Task<bool> TemplateTitleExistsAsync(string title, int? excludeId = null)
    {
        var normalizedTitle = title.ToLower();

        return await _context.MemeTemplates.AnyAsync(template =>
            template.Title.ToLower() == normalizedTitle &&
            (!excludeId.HasValue || template.Id != excludeId.Value));
    }

    private static string? ValidateTemplate(string? title, string? imagePath)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "Назва шаблону не може бути порожньою.";
        }

        if (title.Trim().Length > 120)
        {
            return "Назва шаблону не може бути довшою за 120 символів.";
        }

        if (string.IsNullOrWhiteSpace(imagePath))
        {
            return "Шлях до зображення не може бути порожнім.";
        }

        var normalizedPath = imagePath.Trim();

        if (normalizedPath.Length > 500)
        {
            return "Шлях до зображення не може бути довшим за 500 символів.";
        }

        if (!IsValidTemplateImagePath(normalizedPath))
        {
            return "Неправильний шлях до зображення. Шлях має починатися з /uploads/templates/.";
        }

        return null;
    }

    private static MemeTemplateDto ToDto(MemeTemplate template, string? categoryName, int generatedMemesCount)
    {
        return new MemeTemplateDto
        {
            Id = template.Id,
            Title = template.Title,
            ImagePath = template.ImagePath,
            MemeCategoryId = template.MemeCategoryId,
            CategoryName = categoryName,
            CreatedAt = template.CreatedAt,
            IsActive = template.IsActive,
            GeneratedMemesCount = generatedMemesCount
        };
    }

    private static bool IsValidTemplateImagePath(string imagePath)
    {
        return imagePath.StartsWith(TemplateImagePathPrefix, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeRequiredText(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }
}
