using System.ComponentModel.DataAnnotations;

namespace NeuronFlow.Application.DTOs.Project
{
    public class CreateProjectDto
    {
        [Required]
        public string ProjectName { get; set; }
        public string? ProjectDescription { get; set; }
    }

    public class UpdateProjectDto
    {
        [Required]
        public string ProjectName { get; set; }
        public string? ProjectDescription { get; set; }
    }

    public class ProjectResponseDto
    {
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string? ProjectDescription { get; set; }

        // Audit Info
        public Guid? CreatedBy { get; set; }
        public string? CreatedByName { get; set; } // New Field for Name
        public DateTime? CreatedDate { get; set; }

        public Guid? ModifiedBy { get; set; }
        public string? ModifiedByName { get; set; } // New Field for Name
        public DateTime? ModifiedDate { get; set; }
    }
}
