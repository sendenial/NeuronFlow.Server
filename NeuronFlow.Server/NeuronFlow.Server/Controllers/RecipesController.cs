using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuronFlow.Application.DTOs;
using NeuronFlow.Application.DTOs.Recipe;
using NeuronFlow.Domain.Entities;
using NeuronFlow.Infrastructure.Persistence;
using System.Security.Claims;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/recipes")]
    [ApiController]
    [Authorize]
    public class RecipesController : ControllerBase
    {
        private readonly NeuronFlowDbContext _context;

        public RecipesController(NeuronFlowDbContext context)
        {
            _context = context;
        }

        // GET: api/recipes?projectId=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RecipeResponseDto>>> GetRecipes([FromQuery] Guid? projectId)
        {
            var query = _context.Recipes.AsQueryable();

            if (projectId.HasValue)
                query = query.Where(r => r.ProjectId == projectId.Value);

            var recipes = await query
                .Where(r => !r.IsDelete)
                .OrderByDescending(r => r.ModifiedDate)
                .Select(r => new RecipeResponseDto
                {
                    RecipeId = r.RecipeId,
                    Name = r.Name,
                    Status = r.Status,
                    TriggerType = r.TriggerType,
                    DefinitionJson = r.DefinitionJson,
                    ProjectId = r.ProjectId,
                    ProjectName = r.Project != null ? r.Project.ProjectName : "",
                    CreatedDate = r.CreatedDate,
                    CreatedByName = _context.Users.Where(u => u.Id == r.CreatedBy.ToString()).Select(u => u.FullName).FirstOrDefault() ?? null,
                    ModifiedDate = r.ModifiedDate,
                    ModifiedByName = _context.Users.Where(u => u.Id == r.ModifiedBy.ToString()).Select(u => u.FullName).FirstOrDefault() ?? null
                })
                .ToListAsync();

            return Ok(recipes);
        }

        // GET: api/recipes/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<RecipeResponseDto>> GetRecipe(Guid id)
        {
            var recipe = await _context.Recipes
                .Where(r => r.RecipeId == id && !r.IsDelete)
                .Select(r => new RecipeResponseDto
                {
                    RecipeId = r.RecipeId,
                    Name = r.Name,
                    Status = r.Status,
                    DefinitionJson = r.DefinitionJson,
                    ProjectId = r.ProjectId,
                    CreatedBy = r.CreatedBy // (Add other fields similarly)
                })
                .FirstOrDefaultAsync();

            if (recipe == null) return NotFound();
            return Ok(recipe);
        }

        // POST: api/recipes (Initialize a new recipe)
        [HttpPost]
        public async Task<ActionResult<Recipe>> CreateRecipe(CreateRecipeDto request)
        {
            var userId = GetUserId();

            var recipe = new Recipe
            {
                Name = request.Name,
                ProjectId = request.ProjectId,
                TriggerType = request.TriggerType,
                Status = "Draft",
                DefinitionJson = "{\"steps\": []}", // Empty flow
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                ModifiedBy = userId,
                ModifiedDate = DateTime.UtcNow
            };

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipe), new { id = recipe.RecipeId }, recipe);
        }

        // PUT: api/recipes/{id} (Save builder changes)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecipe(Guid id, UpdateRecipeDto request)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe == null) return NotFound();

            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            Guid? userId = string.IsNullOrEmpty(userIdString) ? null : Guid.Parse(userIdString);

            recipe.Name = request.Name;
            recipe.DefinitionJson = request.DefinitionJson; // Save the JSON flow
            recipe.Status = request.Status;
            recipe.ModifiedBy = userId;
            recipe.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst("uid")?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }
    }
}