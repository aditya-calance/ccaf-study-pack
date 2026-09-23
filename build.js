const fs = require('fs');
const path = require('path');

// Get all markdown files
const files = [
    '00_START_HERE.md',
    '01_foundations/01_exam_intel_and_trend_analysis.md',
    '01_foundations/02_answer_heuristics_and_mental_models.md',
    '02_domain_modules/03_D1a_agentic_loops_and_multi_agent_orchestration.md',
    '02_domain_modules/04_D1b_enforcement_hooks_decomposition_sessions.md',
    '02_domain_modules/05_D2a_tool_design_errors_and_tool_distribution.md',
    '02_domain_modules/06_D2b_mcp_integration_and_builtin_tools.md',
    '02_domain_modules/07_D3a_claude_md_rules_skills_commands.md',
    '02_domain_modules/08_D3b_plan_mode_iterative_refinement_and_cicd.md',
    '02_domain_modules/09_D4a_prompting_fewshot_and_structured_output.md',
    '02_domain_modules/10_D4b_validation_retry_batch_and_multipass_review.md',
    '02_domain_modules/11_D5a_context_management_and_escalation.md',
    '02_domain_modules/12_D5b_error_propagation_human_review_and_provenance.md',
    '03_scenarios_and_updates/13_scenario_playbooks.md',
    '03_scenarios_and_updates/14_whats_new_2026_api_models_claude_code_cowork.md',
    '04_practice/15_official_sample_questions_annotated.md',
    '04_practice/16_practice_D1_agentic_architecture.md',
    '04_practice/17_practice_D2_tools_and_mcp.md',
    '04_practice/18_practice_D3_claude_code.md',
    '04_practice/19_practice_D4_prompting_structured_output.md',
    '04_practice/20_practice_D5_context_and_reliability.md',
    '04_practice/21_full_mock_exam_60q.md',
    '04_practice/22_mock_exam_answers_and_analysis.md',
    '05_reference/23_cheat_sheet_last_hour.md',
    '05_reference/24_hands_on_labs_and_resources.md',
];

const data = {};
files.forEach(file => {
    try {
        data[file] = fs.readFileSync(file, 'utf8');
    } catch (e) {
        console.warn(`Could not read ${file}:`, e.message);
    }
});

console.log(`// Embedded markdown data for ${files.length} files`);
console.log(`const MARKDOWN_DATA = ${JSON.stringify(data)};`);
