using System.ComponentModel.DataAnnotations;

namespace Memoid.Models;

public class GeneratedMeme
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = "Без назви";

    [Required]
    [MaxLength(500)]
    public string ImagePath { get; set; } = string.Empty;

    [MaxLength(30)]
    public string SourceType { get; set; } = "Template";

    public int? MemeTemplateId { get; set; }

    public MemeTemplate? MemeTemplate { get; set; }

    [MaxLength(500)]
    public string? OriginalImagePath { get; set; }

    [MaxLength(200)]
    public string? TopText { get; set; }

    [MaxLength(200)]
    public string? BottomText { get; set; }

    [MaxLength(40)]
    public string TextPosition { get; set; } = "TopAndBottom";

    [MaxLength(80)]
    public string FontFamily { get; set; } = "Arial";

    public int FontSize { get; set; } = 48;

    [MaxLength(30)]
    public string TextColor { get; set; } = "#ffffff";

    [MaxLength(30)]
    public string? TextBackgroundColor { get; set; }

    [MaxLength(80)]
    public string? AppliedEffect { get; set; }

    public bool IsFavorite { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
