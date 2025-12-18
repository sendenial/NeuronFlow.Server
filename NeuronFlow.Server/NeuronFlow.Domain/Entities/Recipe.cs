using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NeuronFlow.Domain.Entities
{
    public class Recipe
    {
        [Key]
        public Guid RecipeId { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; }

        public Guid ProjectId { get; set; }

        [ForeignKey("ProjectId")]
        public virtual Project? Project { get; set; }

        // Status: "Running", "Stopped", "Draft"
        public string Status { get; set; } = "Draft";

        // The "Starting Point" type (e.g., "AppEvent", "Schedule", "Webhook")
        public string TriggerType { get; set; } = "AppEvent";

        // Stores the entire visual flow structure (Steps, Logic, Mappings)
        // We use JSON because integration flows vary wildly in structure.
        public string DefinitionJson { get; set; } = "{}";

        // Audit Fields
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public Guid? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public bool IsDelete { get; set; } = false;
    }
}
