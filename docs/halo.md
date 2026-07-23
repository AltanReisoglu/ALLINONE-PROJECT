HALO: Using RLMs to build self-improving agents
Sam Hogan 🇺🇸

@samhogan
·
15 May

AI Agents are composed of two key elements: a model and a harness. The model decides what to do; the harness does it. An AI agent is what you get when you put a model into the harness and start a loop. Billions of dollars have been spent improving the models. Not as much attention has been paid to the harness, until recently. 

The Mismanaged Genius Hypothesis from @a1zhang posits that LLMs do indeed possess superhuman intelligence, but perhaps us humans are not very good at managing the harnesses that turn these models into Agents, and perhaps there is path to creating better agents by letting the models themselves decide the shape the harness should take. 

To explore this idea, we built HALO (Hierarchical Agent Loop Optimizer).

Original Post: https://x.com/samhogan/status/2049619541727302040?s=20
GitHub: https://github.com/context-labs/halo
We spent the last few weeks applying HALO to popular benchmarks in order to determine whether or not our strategy is indeed effective. We have found that HALO is consistently able to improve benchmark scores across a variety of evaluations, including 10%+ improvements on AppWorld, TerminalBench, Finance Bench, and more. These results suggest that the harness is becoming an optimizable service layer: comparable in importance to the model itself, and increasingly measurable as its own object of engineering.

Today we’re releasing our findings from this effort.
HALO Benchmark Results
What is HALO?
HALO is an Agent (model + harness) that optimizes other Agents (again, model + harness) by decomposing their execution traces to understand how the harness is performing, and how it can be improved. It is powered by an RLM with specific tools that allow it to perform in-depth analysis across hundreds of thousands of Agent executions at a time, identify common issues across executions, and suggest changes to the harness that will improve the Agent’s overall performance.
The core HALO loop is surprisingly simple:
Collect execution traces from an agent.
Feed those traces into HALO.
HALO analyzes the traces to identify recurring failure modes.
HALO produces a report describing likely harness-level fixes.
Those fixes are applied to the agent harness by a coding agent.
The agent is re-run, new traces are collected, and the cycle repeats.
This is different from manually inspecting a few failures. Many harness problems are not obvious in individual traces. Each failed run can look locally reasonable - patterns only emerge when the agent’s behavior is analyzed across many executions. HALO is designed to surface these aggregate patterns and translate them into concrete harness changes.
The HALO Loop
Terminal-Bench: Gemini Flash toward frontier coding harness performance
The strongest result from our recent experiments came from applying HALO to Terminal-Bench.
Terminal-Bench is a messy benchmark in the useful sense. The agent is dropped into a real shell with a filesystem and must complete tasks that are graded on the final end state. Success is defined by how well the harness manages exploration, shell commands, file inspection, and task execution.
The baseline using the terminus-2 harness on gemini-3-flash-preview was 46%. After applying HALO-generated harness changes, the pass rate increased to 57.14%. For reference, Claude Code on Opus 4.6 scores 58% on the same benchmark.
HALO identified a recurring pattern in the traces: the agent’s first commands were often too generic. After receiving the task, it would frequently begin with broad orientation commands like directory listings or wide file searches. While appearing fairly benign in any single trace, this is a pattern that HALO found to reduce completion rates by consuming the agents limited turn budget with commands that did not yield valuable information.
The fix was to make the agent more task-directed earlier in the trajectory. HALO recommended prompt and configuration changes that encouraged the agent to form a concrete hypothesis about the task before defaulting to broad filesystem exploration. After these changes, the agent spent less time orienting generically and more time taking task-relevant actions.
This is a good example of a harness-shaped failure. The model was capable enough to solve many of the tasks, but the harness was allowing too much low-value exploration.
Finance-Agent: larger gains when the baseline has answer-quality slack
We also ran HALO on the Vals AI Finance-Agent benchmark across four models.
The largest improvement came from claude-opus-4-7. The baseline score was 56% combined. After applying HALO, the score increased to 72% combined. Again, was achieved solely by making improvements to the harness.
In Finance-Agent, the agent would often gather relevant information but fail to produce a complete final answer. Surprisingly, the primary failure here was answer construction and not search-related.
HALO identified that the baseline harness was often able to reach the correct answer, but failed to submit in the required format. HALO recommended a more explicit coverage rubric that pushed the agent to check whether the final answer addressed the required dimensions of the question. For claude-opus-4-7, this simple change increased performance 18% over baseline.
This same formatting change did not help every model equally. 

GPT-5.5 started from a stronger baseline of 72%, so the same style of improvement produced only a small additional lift. Kimi-K2.6 moved in the other direction: the heavier coverage rubric that helped Opus degraded performance. In the next loop, HALO identified this and recommended a lighter, more concrete facts-oriented instruction, bringing Kimi-K2.6 from 56% to 64%.
This is another useful property of trace-driven harness optimization - the best harness is not universal. Different models have different failure modes, and the same prompt change can help one model while hurting another. HALO is useful precisely because it searches for the harness shape that fits a particular model and execution environment.
AppWorld: improving stateful tool use and long-horizon execution
AppWorld tests whether agents can operate across application-like environments with stateful APIs, tool calls, and multi-step user goals. These tasks are close to the kinds of long-horizon execution problems that appear in production agents. The agent must understand the user’s goal, choose the right tools, maintain state, and avoid small errors that compound over multiple steps.
AppWorld Results
In our AppWorld evaluations, HALO produced large gains on both Sonnet 4.6 and Gemini 3 Flash. On Sonnet 4.6, performance improved from 73.7% to 89.5%. On Gemini 3 Flash, performance improved from 36.8% to 52.6%.
The first major failure mode was tool availability. In several traces, the model appeared to understand what it needed to do, but the harness had not exposed the right fallback tool. For example, when a Venmo transaction failed because the account balance was insufficient, the agent tried to recover by using a payment-card path. The relevant API existed, but it was not available to the agent because the API predictor had left it out. The resulting failure looked like a model hallucination at the surface, but the trace-level diagnosis showed that the agent’s tool surface was too narrow for realistic recovery behavior.
HALO improved the API prediction layer by modifying the harness to be better at exposing the tools that a reasonable agent might need. The predictor was pushed toward higher recall, especially for login, search, show, list, get, supervisor, temporal, people-search, and fallback APIs. In the Sonnet run, the maximum predicted API budget was also increased so real recovery APIs were less likely to be cut off before reaching the agent.
The AppWorld result is a useful example of harness optimization moving through layers. First, HALO made the right tools available. Then it reduced wasteful or unrecoverable tool behavior. Then it improved final-answer and bulk-action verification. The gains came from making the loop more reliable rather than changing the underlying models.
SWE-Bench: lightweight verification beats over-constrained debugging
SWE-Bench stresses a different part of the agent harness. The agent must inspect a repository, understand the issue, make a code change, and produce a patch that passes tests.
SWE-Bench Results
In our SWE-Bench Verified run with terminus-2 on Gemini 3 Flash, the baseline was already strong at 65.0%. After HALO-generated harness changes, the peak score increased to 74.0%.
The most reliable improvement came from a simple prompt change. HALO recommended that the agent run the relevant failing tests after editing, run a fast lint or syntax check, re-read the issue, confirm that the root cause had been addressed, and check nearby callers before making risky edits. This pushed the agent to close the loop between patch generation and verification.
HALO also surfaced a recurring debugging pattern in the remaining failures: the agent sometimes began with shallow repository orientation before grounding itself in the actual failure. Commands like broad listings, generic searches, or filesystem probes could look reasonable in a single trace, but across many traces they delayed the moment when the agent reproduced the bug or inspected the failing assertion. This was a failure very similar to what we saw in Terminal Bench.
The SWE-Bench result shows a different lesson from AppWorld. In AppWorld, the harness needed better tool recall and execution discipline. In SWE-Bench, the harness needed better verification pressure, but not so much pressure that it over-managed the agent.
tau3-Bench: identifying the boundary between harness failure and model capability failure
HALO does not turn every failure into a harness fix.
This was clearest on tau3-Bench, Sierra Research’s benchmark of 375 tasks across airline, retail, telecom, and banking_knowledge domains. Our baseline on gemini-3-flash-preview was 64.27%. After applying HALO-generated changes, the score increased to 67.47%.
This was a real improvement, but it was smaller than the gains we saw on other benchmarks. Three of the four domains had pass rates that HALO could nudge upward. The fourth domain, banking_knowledge, was a hard bottleneck. The agent repeatedly failed on policy questions that required recalling and applying specific banking policy details. In these cases, the problem was not mainly the harness. The model was confidently paraphrasing policy rather than retrieving or applying the relevant facts.
HALO surfaced this distinction directly. It found that banking_knowledge appeared capped around 10% accuracy regardless of how the agent was prompted. We tried several harness changes, including deeper policy-lookup discipline, a search cap, and single-snippet compression. While each helped slightly, none broke through the bottleneck.
This is an important negative result. HALO can find slack in harnesses, but it cannot reinvent missing knowledge from the models itself.
This distinction matters for production agents, as not every failure is a prompt problem and not every failure is a model problem. One of the practical uses of HALO is to separate the two. It is clear that this is a useful tool for both figuring out if greater model capabilities are needed, and for finding out if the harness is mismanaging the model.
Cross-benchmark summary
Across Terminal-Bench, Finance-Agent, AppWorld, SWE-Bench, and tau3-Bench, the same pattern appeared repeatedly where agent performance is often limited by harness-level failure modes that are difficult to see from individual traces.
The specific failure modes varied by benchmark:
On Terminal-Bench, the agent spent too much early budget on generic exploration.
On Finance-Agent, the agent often gathered the right information but failed to produce a complete answer.
On AppWorld, the agent often needed better tool recall, better fallback behavior, stricter completion discipline, and more careful verification on long enumerations or bulk state changes.
On SWE-Bench, the agent benefited from lightweight verification after editing, but heavier or more prescriptive debugging instructions could over-constrain the loop.
On tau3-Bench, HALO found both harness-level improvements and a domain where the bottleneck appeared to be model capability rather than harness design.
The common thread is that these were not failures that could be fully understood by reading one or two traces, but were aggregate behavioral patterns. Once surfaced, many of them were addressable through prompt, configuration, or tool-definition changes.
This is why we think agent loop optimization is becoming its own engineering discipline. The harness is now becoming more important than ever, managing how the model handles uncertainty, how it recovers from mistakes, and how it decides when it is done.
A strong model in a bad harness might still get the job done. A strong model in a good harness will unlock new levels of capabilities.
Next steps for HALO
The last few years of AI progress have been dominated by model improvement. Fundamental model improvements will likely continue. Our results from these experiments suggest that a meaningful amount of agent performance is now available at the harness layer.
HALO is our attempt to make that layer measurable and optimizable. It uses traces to identify recurring agent-loop failures, distinguishes harness-shaped failures from model capability limits, and recommends concrete changes to the prompt configuration, loop behavior, and tool definitions.
We have been taking these learnings past standard benchmarks and into real-world agent deployments, working with a small number of teams running agents at scale to apply HALO techniques in environments with substantial traffic.

If you are running agents in production and are interested in having our team apply HALO to your agents, reach out to me (@samhogan) or @AmarSVS for more information.