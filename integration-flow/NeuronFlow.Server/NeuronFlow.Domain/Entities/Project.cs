using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace NeuronFlow.Domain.Entities
{
    public class Project
    {
        [Key]
        public Guid ProjectId { get; set; } = Guid.NewGuid();

        [Required]
        public string ProjectName { get; set; }
        public string? ProjectDescription { get; set; }

        public Guid? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; } = DateTime.UtcNow;
        public Guid? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsDelete { get; set; } = false;

        public ICollection<Connection> Connections { get; set; } = new List<Connection>();
    }
}