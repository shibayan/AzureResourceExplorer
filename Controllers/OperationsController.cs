using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using ARMExplorer.Internal;
using ARMExplorer.Models;

using Microsoft.AspNetCore.Mvc;
using Microsoft.VisualBasic.CompilerServices;

namespace ARMExplorer.Controllers
{
    [Route("api")]
    [ApiController]
    public class OperationsController : ControllerBase
    {
        public OperationsController(ArmRepository armRepository)
        {
            _armRepository = armRepository;
        }

        private readonly ArmRepository _armRepository;

        [HttpGet("providers")]
        public async Task<ActionResult> GetAllProviders()
        {
            var allProviders = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var tasks = new List<Task<HashSet<string>>>();

            foreach (var subscription in await _armRepository.GetSubscriptionsAsync())
            {
                tasks.Add(_armRepository.GetProvidersAsync(subscription.SubscriptionId));
            }

            foreach (var hashSet in await Task.WhenAll(tasks))
            {
                allProviders.UnionWith(hashSet);
            }

            allProviders.Add("MICROSOFT.RESOURCES");
            allProviders.Add("MICROSOFT.CAPACITY");

            return Ok(allProviders);
        }

        [HttpGet("operations/providers/{subscriptionId}")]
        public async Task<ActionResult> GetProviders(string subscriptionId)
        {
            return Ok();
        }

        [HttpPost("operations")]
        public async Task<ActionResult> Invoke()
        {
            return Ok();
        }

        [HttpPost("all-operations")]
        public async Task<ActionResult> GetPost()
        {
            return Ok(new[]
            {
                new MetadataObject
                {
                    MethodName = "Get",
                    HttpMethod = "GET",
                    Url = "/subscriptions/{subscriptionId}/locations",
                    ApiVersion = "2020-10-01"
                }
            });
        }
    }
}
