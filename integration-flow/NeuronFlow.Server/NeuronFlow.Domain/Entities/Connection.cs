using NeuronFlow.Application.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NeuronFlow.Domain.Entities
{
    public class Connection
    {
        [Key]
        public Guid ConnectorId { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public ConnectionType ConnectorType { get; set; }

        public string ConfigJson { get; set; } = string.Empty;

        public Guid ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        public virtual Project? Project { get; set; }

        public Guid? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; } = DateTime.UtcNow;
        public Guid? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsDelete { get; set; } = false;
    }
}