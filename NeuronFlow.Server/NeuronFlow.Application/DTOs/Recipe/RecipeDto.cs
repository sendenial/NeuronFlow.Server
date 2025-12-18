using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NeuronFlow.Application.DTOs.Recipe
{
    public class CreateRecipeDto
    {
        public string Name { get; set; }
        public Guid ProjectId { get; set; }
        public string TriggerType { get; set; } // "AppEvent", "Schedule", etc.
    }

    public class UpdateRecipeDto
    {
        public string Name { get; set; }
        public string DefinitionJson { get; set; } // The JSON from the frontend builder
        public string Status { get; set; }
    }

    public class RecipeResponseDto
    {
        public Guid RecipeId { get; set; }
        public string Name { get; set; }
        public string Status { get; set; }
        public string TriggerType { get; set; }
        public string DefinitionJson { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }

        public Guid? CreatedBy { get; set; }
        public Guid? ModifiedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedByName { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public string ModifiedByName { get; set; }
    }
}
