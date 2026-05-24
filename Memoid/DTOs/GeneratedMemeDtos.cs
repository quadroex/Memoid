namespace Memoid.DTOs;

public class GeneratedMemeDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string ImagePath { get; set; } = string.Empty;

    public string SourceType { get; set; } = string.Empty;

    public int? MemeTemplateId { get; set; }

    public string? TemplateTitle { get; set; }

    public string? OriginalImagePath { get; set; }

    public string? TopText { get; set; }

    public string? BottomText { get; set; }

    public string TextPosition { get; set; } = string.Empty;

    public string FontFamily { get; set; } = string.Empty;

    public int FontSize { get; set; }

    public string TextColor { get; set; } = string.Empty;

    public string? TextBackgroundColor { get; set; }

    public string? AppliedEffect { get; set; }

    public bool IsFavorite { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class CreateGeneratedMemeDto
{
    public string? Title { get; set; }

    public string? ImagePath { get; set; }

    public string? SourceType { get; set; }

    public int? MemeTemplateId { get; set; }

    public string? OriginalImagePath { get; set; }

    public string? TopText { get; set; }

    public string? BottomText { get; set; }

    public string? TextPosition { get; set; }

    public string? FontFamily { get; set; }

    public int FontSize { get; set; }

    public string? TextColor { get; set; }

    public string? TextBackgroundColor { get; set; }

    public string? AppliedEffect { get; set; }
}

public class UpdateGeneratedMemeDto
{
    public string? Title { get; set; }

    public bool IsFavorite { get; set; }
}
