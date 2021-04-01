using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

using ARMExplorer.Internal;
using ARMExplorer.Models;

using Microsoft.AspNetCore.Mvc;

namespace ARMExplorer.Controllers
{
    [Route("api")]
    [ApiController]
    public class ArmController : ControllerBase
    {
        public ArmController(ArmRepository armRepository)
        {
            _armRepository = armRepository;
        }

        private readonly ArmRepository _armRepository;

        public const string TenantIdClaimType = "http://schemas.microsoft.com/identity/claims/tenantid";

        [HttpGet("token")]
        public ActionResult GetToken()
        {
            return Ok(new
            {
                given_name = User.FindFirstValue(ClaimTypes.GivenName),
                family_name = User.FindFirstValue(ClaimTypes.Surname),
                name = User.FindFirstValue(ClaimTypes.Name),
                email = User.FindFirstValue(ClaimTypes.Email),
                upn = User.FindFirstValue(ClaimTypes.Upn)
            });
        }

        [HttpGet("tenants")]
        public async Task<ActionResult> GetTenants()
        {
            var tenants = await _armRepository.GetTenantsAsync();

            var tenantId = User.FindFirstValue(TenantIdClaimType);

            return Ok(tenants.Select(x => new TenantDetail
            {
                TenantId = x.tenantId,
                DisplayName = x.displayName,
                DomainName = x.defaultDomain,
                Current = x.tenantId == tenantId
            }));
        }

        [HttpGet("search")]
        public async Task<ActionResult> Search(string keyword)
        {
            var tasks = new List<Task<IReadOnlyList<object>>>();

            foreach (var subscription in await _armRepository.GetSubscriptionsAsync())
            {
                tasks.Add(_armRepository.GetResourcesAsync<object>(subscription.SubscriptionId, keyword));
            }

            var result = (await Task.WhenAll(tasks)).SelectMany(x => x);

            return Ok(result);
        }

        [HttpGet("{*path}")]
        public async Task<ActionResult> Get(string path)
        {
            return Ok();
        }
    }
}
