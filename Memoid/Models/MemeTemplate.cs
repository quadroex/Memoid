using System.ComponentModel.DataAnnotations;

namespace Memoid.Models;

public class MemeTemplate
{
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string ImagePath { get; set; } = string.Empty;

    public int MemeCategoryId { get; set; }

    public MemeCategory? MemeCategory { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    public ICollection<GeneratedMeme> GeneratedMemes { get; set; } = new List<GeneratedMeme>();
}
