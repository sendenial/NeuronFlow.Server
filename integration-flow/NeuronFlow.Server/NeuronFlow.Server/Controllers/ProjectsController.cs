using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuronFlow.Application.DTOs.Project;
using NeuronFlow.Domain.Entities;
using NeuronFlow.Infrastructure.Persistence;
using System.Security.Claims;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/projects")]
    [ApiController]
    [Authorize] // Requires Authentication
    public class ProjectsController : ControllerBase
    {
        private readonly NeuronFlowDbContext _context;

        public ProjectsController(NeuronFlowDbContext context)
        {
            _context = context;
        }

        // GET: api/projects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectResponseDto>>> GetProjects()
        {
            // We use .Select() to project the data and look up the user names
            var projects = await _context.Projects
                .Where(p => !p.IsDelete)
                .OrderByDescending(p => p.CreatedDate) // Sort by newest
                .Select(p => new ProjectResponseDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName,
                    ProjectDescription = p.ProjectDescription,

                    CreatedBy = p.CreatedBy,
                    CreatedDate = p.CreatedDate,
                    CreatedByName = _context.Users
                        .Where(u => u.Id == p.CreatedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown",

                    ModifiedBy = p.ModifiedBy,
                    ModifiedDate = p.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == p.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown"
                })
                .ToListAsync();

            return Ok(projects);
        }

        // GET: api/projects/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectResponseDto>> GetProject(Guid id)
        {
            var project = await _context.Projects
                .Where(p => p.ProjectId == id && !p.IsDelete)
                .Select(p => new ProjectResponseDto
                {
                    ProjectId = p.ProjectId,
                    ProjectName = p.ProjectName,
                    ProjectDescription = p.ProjectDescription,

                    CreatedBy = p.CreatedBy,
                    CreatedDate = p.CreatedDate,
                    CreatedByName = _context.Users
                        .Where(u => u.Id == p.CreatedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown",

                    ModifiedBy = p.ModifiedBy,
                    ModifiedDate = p.ModifiedDate,
                    ModifiedByName = _context.Users
                        .Where(u => u.Id == p.ModifiedBy.ToString())
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "Unknown"
                })
                .FirstOrDefaultAsync();

            if (project == null) return NotFound();

            return Ok(project);
        }

        // POST: api/projects
        [HttpPost]
        public async Task<ActionResult<Project>> CreateProject(CreateProjectDto request)
        {
            var userId = GetUserId();

            var project = new Project
            {
                ProjectName = request.ProjectName,
                ProjectDescription = request.ProjectDescription,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                IsDelete = false
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProject), new { id = project.ProjectId }, project);
        }

        // PUT: api/projects/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProject(Guid id, UpdateProjectDto request)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null || project.IsDelete) return NotFound();

            var userId = GetUserId();

            project.ProjectName = request.ProjectName;
            project.ProjectDescription = request.ProjectDescription;
            project.ModifiedBy = userId;
            project.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/projects/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(Guid id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null || project.IsDelete) return NotFound();

            var userId = GetUserId();

            // Soft Delete
            project.IsDelete = true;
            project.ModifiedBy = userId;
            project.ModifiedDate = DateTime.UtcNow;

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