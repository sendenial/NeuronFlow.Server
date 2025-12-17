using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NeuronFlow.Server.Entity;

namespace NeuronFlow.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly DummyApiContext _context;

        public CustomersController(DummyApiContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);

            if (customer == null)
                return NotFound();

            return customer;
        }

        [HttpPost]
        public async Task<ActionResult<List<Customer>>> CreateCustomer([FromBody]List<Customer> customer)
        {
            try
            {
                _context.Customers.AddRange(customer);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message;
                return BadRequest(inner); // log or inspect in debugger
            }

            return Ok();
        }
    }
}
