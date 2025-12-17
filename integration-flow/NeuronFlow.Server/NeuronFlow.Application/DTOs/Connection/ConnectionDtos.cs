using NeuronFlow.Application.Enums;
using System.ComponentModel.DataAnnotations;

namespace NeuronFlow.Application.DTOs.Connection
{
    public class CreateConnectionDto
    {
        [Required]
        public Guid ProjectId { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public ConnectionType ConnectorType { get; set; }
        public string ConfigJson { get; set; }
    }

    public class UpdateConnectionDto
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public ConnectionType ConnectorType { get; set; }
        public string ConfigJson { get; set; }
    }

    public class ConnectionResponseDto
    {
        public Guid ConnectorId { get; set; }
        public string Name { get; set; }
        public ConnectionType ConnectorType { get; set; }
        public string ConfigJson { get; set; }

        // Project Info
        public Guid ProjectId { get; set; }
        public string? ProjectName { get; set; } // Useful to have

        // Audit Fields
        public Guid? CreatedBy { get; set; }
        public string? CreatedByName { get; set; } // <--- New
        public DateTime? CreatedDate { get; set; }

        public Guid? ModifiedBy { get; set; }
        public string? ModifiedByName { get; set; } // <--- New
        public DateTime? ModifiedDate { get; set; }
    }
}
