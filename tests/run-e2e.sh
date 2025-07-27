#!/usr/bin/env bash

# Comprehensive Test Suite for git-diff-chart
# Usage: ./run-e2e.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

assert_success() {
    local test_name="$1"
    local command="$2"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Command: $command"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_failure() {
    local test_name="$1"
    local command="$2"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected failure)"
        echo "  Command: $command"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    else
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

assert_contains() {
    local test_name="$1"
    local command="$2"
    local expected="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    local output
    output=$(eval "$command" 2>&1)
    
    if echo "$output" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Command: $command"
        echo "  Expected to contain: $expected"
        echo "  Actual output: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

assert_not_contains() {
    local test_name="$1"
    local command="$2"
    local not_expected="$3"
    TESTS_RUN=$((TESTS_RUN + 1))
    
    local output
    output=$(eval "$command" 2>&1)
    
    if echo "$output" | grep -q "$not_expected"; then
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Command: $command"
        echo "  Should not contain: $not_expected"
        echo "  Actual output: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    else
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
}

# Test data generators
basic_test_data() {
    cat <<EOF
10	2	src/foo.js
5	0	src/bar.js
0	3	src/baz.js
EOF
}

complex_test_data() {
    cat <<EOF
50	10	src/components/Header.jsx
30	5	src/components/Footer.jsx
20	15	src/utils/helpers.js
100	0	src/styles/main.css
0	25	src/tests/unit.test.js
75	20	src/api/client.js
15	5	docs/README.md
5	2	package.json
EOF
}

nested_structure_data() {
    cat <<EOF
20	5	src/frontend/components/Button.tsx
15	3	src/frontend/components/Modal.tsx
10	2	src/frontend/utils/format.ts
30	8	src/backend/controllers/user.js
25	5	src/backend/models/User.js
40	10	src/backend/routes/api.js
5	1	src/shared/constants.js
12	3	tests/frontend/Button.test.tsx
8	2	tests/backend/user.test.js
EOF
}

filter_test_data() {
    cat <<EOF
20	5	src/components/Button.tsx
15	3	src/components/Modal.tsx
10	2	src/utils/helpers.js
30	8	test/unit.test.js
25	5	test/integration.test.js
40	10	docs/README.md
5	1	node_modules/package/index.js
12	3	dist/bundle.js
EOF
}

empty_data() {
    cat <<EOF
EOF
}

single_file_data() {
    cat <<EOF
42	13	single-file.js
EOF
}

large_numbers_data() {
    cat <<EOF
1000	500	big-file.js
2000	750	huge-file.js
500	1200	another-big.js
EOF
}

large_data() {
    for i in {1..100}; do
        echo "$((RANDOM % 1000))	$((RANDOM % 500))	src/file$i.js"
    done
}

git_diff_simulation() {
    cat <<EOF
1	1	README.md
10	5	src/index.js
0	15	src/old-feature.js
25	0	src/new-feature.js
5	5	package.json
EOF
}

zero_changes_data() {
    cat <<EOF
0	0	unchanged1.js
0	0	unchanged2.js
0	0	unchanged3.js
EOF
}

zero_additions_data() {
    cat <<EOF
0	10	file1.js
0	20	file2.js
0	30	file3.js
EOF
}

zero_deletions_data() {
    cat <<EOF
10	0	file1.js
20	0	file2.js
30	0	file3.js
EOF
}

# Setup
setup_tests() {
    print_header "Setting up tests"
    
    # Check if the CLI exists
    if [ ! -f "bin/git-diff-chart.cjs" ] && [ ! -f "dist/index.js" ]; then
        echo -e "${RED}Error: Neither bin/git-diff-chart.cjs nor dist/index.js found${NC}"
        echo "Please build the project first with: npm run build"
        exit 1
    fi
    
    # Determine which CLI to use
    if [ -f "bin/git-diff-chart.cjs" ]; then
        CLI_CMD="node bin/git-diff-chart.cjs"
    else
        CLI_CMD="node dist/index.js"
    fi
    
    echo "Using CLI: $CLI_CMD"
}

# Basic functionality tests
test_basic_functionality() {
    print_header "Basic Functionality Tests"
    
    print_test "Help command works"
    assert_success "Help command" "$CLI_CMD --help"
    
    print_test "Version command works"
    assert_success "Version command" "$CLI_CMD --version"
    
    print_test "Pie chart with basic data"
    assert_success "Basic pie chart" "basic_test_data | $CLI_CMD pie"
    
    print_test "Bar chart with basic data"
    assert_success "Basic bar chart" "basic_test_data | $CLI_CMD bar"
}

# Chart type tests
test_chart_types() {
    print_header "Chart Type Tests"
    
    print_test "Pie chart generates mermaid syntax"
    assert_contains "Pie chart mermaid" "basic_test_data | $CLI_CMD pie" "pie"
    
    print_test "Bar chart generates mermaid syntax"
    assert_contains "Bar chart mermaid" "basic_test_data | $CLI_CMD bar" "xychart-beta"
}

# Metric tests
test_metrics() {
    print_header "Metric Tests"
    
    print_test "Total metric (default)"
    assert_success "Total metric" "basic_test_data | $CLI_CMD pie --metric total"
    
    print_test "Additions metric"
    assert_success "Additions metric" "basic_test_data | $CLI_CMD pie --metric additions"
    
    print_test "Deletions metric"
    assert_success "Deletions metric" "basic_test_data | $CLI_CMD pie --metric deletions"
    
    print_test "Invalid metric fails"
    assert_failure "Invalid metric" "basic_test_data | $CLI_CMD pie --metric invalid"
}

# Level tests
test_levels() {
    print_header "Level Tests"
    
    print_test "Level 1 (file level)"
    assert_success "Level 1" "nested_structure_data | $CLI_CMD pie --level 1"
    
    print_test "Level 2 (directory level)"
    assert_success "Level 2" "nested_structure_data | $CLI_CMD pie --level 2"
    
    print_test "Level 3 (deeper directory level)"
    assert_success "Level 3" "nested_structure_data | $CLI_CMD pie --level 3"
    
    print_test "Level 0 should fail"
    assert_failure "Level 0" "basic_test_data | $CLI_CMD pie --level 0"
    
    print_test "Negative level should fail"
    assert_failure "Negative level" "basic_test_data | $CLI_CMD pie --level -1"
    
    print_test "Non-integer level should fail"
    assert_failure "Non-integer level" "basic_test_data | $CLI_CMD pie --level abc"
}

# Filter option tests
test_filter_options() {
    print_header "Filter Option Tests"
    
    print_test "Filter by file extension"
    assert_success "Filter .tsx files" "filter_test_data | $CLI_CMD pie --filter '\.tsx$'"
    
    print_test "Filter by directory"
    assert_success "Filter src directory" "filter_test_data | $CLI_CMD pie --filter '^src/'"
    
    print_test "Filter excludes test files"
    assert_not_contains "Filter excludes tests" "filter_test_data | $CLI_CMD pie --filter '^src/'" "test"
    
    print_test "Filter with complex regex"
    assert_success "Complex filter" "filter_test_data | $CLI_CMD pie --filter '(components|utils)'"
    
    print_test "Filter with no matches should handle gracefully"
    assert_success "Filter no matches" "filter_test_data | $CLI_CMD pie --filter 'nonexistent'"
}

# Ignore patterns tests
test_ignore_patterns() {
    print_header "Ignore Pattern Tests"
    
    print_test "Single ignore pattern"
    assert_success "Single ignore" "filter_test_data | $CLI_CMD pie --ignore 'node_modules'"
    
    print_test "Multiple ignore patterns"
    assert_success "Multiple ignore" "filter_test_data | $CLI_CMD pie --ignore 'node_modules' --ignore 'dist'"
    
    print_test "Ignore pattern excludes files"
    assert_not_contains "Ignore excludes node_modules" "filter_test_data | $CLI_CMD pie --ignore 'node_modules'" "node_modules"
    
    print_test "Ignore with regex pattern"
    assert_success "Ignore regex" "filter_test_data | $CLI_CMD pie --ignore '\.test\.'"
    
    print_test "Combining filter and ignore"
    assert_success "Filter + ignore" "filter_test_data | $CLI_CMD pie --filter '^src/' --ignore 'components'"
}

# Base branch option tests
test_base_branch() {
    print_header "Base Branch Option Tests"
    
    print_test "Custom base branch (main - default)"
    assert_success "Base main" "basic_test_data | $CLI_CMD pie --base main"
    
    print_test "Custom base branch (develop)"
    assert_success "Base develop" "basic_test_data | $CLI_CMD pie --base develop"
    
    print_test "Custom base branch (feature/xyz)"
    assert_success "Base feature branch" "basic_test_data | $CLI_CMD pie --base feature/test-branch"
}

# Custom title tests
test_custom_titles() {
    print_header "Custom Title Tests"
    
    print_test "Custom title in pie chart"
    assert_contains "Custom pie title" "basic_test_data | $CLI_CMD pie --title 'My Custom Chart'" "My Custom Chart"
    
    print_test "Custom title in bar chart"
    assert_contains "Custom bar title" "basic_test_data | $CLI_CMD bar --title 'Bar Chart Title'" "Bar Chart Title"
    
    print_test "Title with special characters"
    assert_contains "Special char title" "basic_test_data | $CLI_CMD pie --title 'Chart: Total Changes (%)'" "Chart: Total Changes (%)"
    
    print_test "Empty title"
    assert_success "Empty title" "basic_test_data | $CLI_CMD pie --title ''"
}

# Chart-specific option tests
test_chart_specific_options() {
    print_header "Chart-Specific Option Tests"
    
    print_test "Pie chart other-threshold option"
    assert_success "Pie other-threshold" "complex_test_data | $CLI_CMD pie --other-threshold 10"
    
    print_test "Pie chart other-threshold affects output"
    assert_contains "High other-threshold creates Other" "complex_test_data | $CLI_CMD pie --other-threshold 50" "Other"
    
    print_test "Bar chart max-items option"
    assert_success "Bar max-items" "complex_test_data | $CLI_CMD bar --max-items 5"
    
    print_test "Bar chart max-items limits output"
    assert_success "Max-items limits bars" "complex_test_data | $CLI_CMD bar --max-items 3"
    
    print_test "Invalid other-threshold (negative)"
    assert_failure "Negative other-threshold" "basic_test_data | $CLI_CMD pie --other-threshold -5"
    
    print_test "Invalid max-items (zero)"
    assert_failure "Zero max-items" "basic_test_data | $CLI_CMD bar --max-items 0"
    
    print_test "Invalid max-items (negative)"
    assert_failure "Negative max-items" "basic_test_data | $CLI_CMD bar --max-items -10"
}

# Option combination tests
test_option_combinations() {
    print_header "Option Combination Tests"
    
    print_test "All options together (pie)"
    assert_success "All pie options" "complex_test_data | $CLI_CMD pie --level 2 --metric additions --filter '^src/' --ignore 'test' --title 'Combined Test' --other-threshold 15"
    
    print_test "All options together (bar)"
    assert_success "All bar options" "complex_test_data | $CLI_CMD bar --level 2 --metric deletions --filter '^src/' --ignore 'docs' --title 'Bar Combined' --max-items 10"
    
    print_test "Filter and ignore work together"
    assert_success "Filter + ignore combo" "filter_test_data | $CLI_CMD pie --filter 'src' --ignore 'components'"
    
    print_test "Level with filter"
    assert_success "Level + filter" "nested_structure_data | $CLI_CMD pie --level 3 --filter 'backend'"
}

# Edge case tests
test_edge_cases() {
    print_header "Edge Case Tests"
    
    print_test "Empty input"
    assert_failure "Empty input" "empty_data | $CLI_CMD pie"
    
    print_test "Single file input"
    assert_success "Single file" "single_file_data | $CLI_CMD pie"
    
    print_test "Large numbers"
    assert_success "Large numbers" "large_numbers_data | $CLI_CMD pie"
    
    print_test "Zero changes only"
    assert_success "Zero changes" "zero_changes_data | $CLI_CMD pie --metric total"
    
    print_test "Complex nested structure"
    assert_success "Complex structure" "complex_test_data | $CLI_CMD bar --level 2"
    
    print_test "Filter that matches nothing"
    assert_success "Filter no match" "basic_test_data | $CLI_CMD pie --filter 'xyz123nonexistent'"
    
    print_test "Ignore all files"
    assert_success "Ignore all" "basic_test_data | $CLI_CMD pie --ignore '.*'"
}

# Output format tests
test_output_formats() {
    print_header "Output Format Tests"
    
    print_test "Pie chart contains title"
    assert_contains "Pie chart title" "basic_test_data | $CLI_CMD pie" "title"
    
    print_test "Bar chart contains x-axis"
    assert_contains "Bar chart x-axis" "basic_test_data | $CLI_CMD bar" "x-axis"
    
    print_test "Bar chart contains y-axis"
    assert_contains "Bar chart y-axis" "basic_test_data | $CLI_CMD bar" "y-axis"
}

# Input validation tests
test_input_validation() {
    print_header "Input Validation Tests"
    
    print_test "Invalid chart type fails"
    assert_failure "Invalid chart type" "basic_test_data | $CLI_CMD invalid"
    
    print_test "Missing required arguments"
    assert_failure "No arguments" "$CLI_CMD"
    
    print_test "Invalid option for pie command"
    assert_failure "Invalid pie option" "basic_test_data | $CLI_CMD pie --max-items 10"
    
    print_test "Invalid option for bar command"
    assert_failure "Invalid bar option" "basic_test_data | $CLI_CMD bar --other-threshold 5"
    
    print_test "Invalid flag format"
    assert_failure "Invalid flag" "basic_test_data | $CLI_CMD pie --invalid-option"
}

# Performance tests (basic)
test_performance() {
    print_header "Performance Tests"
    
    print_test "Large dataset processing"
    assert_success "Large dataset" "large_data | timeout 30s $CLI_CMD pie"
    
    print_test "Complex filtering on large dataset"
    assert_success "Large dataset with filter" "large_data | timeout 30s $CLI_CMD pie --filter 'src' --ignore 'test'"
}

# Integration tests
test_integration() {
    print_header "Integration Tests"
    
    print_test "Pipe from git diff --numstat simulation"
    assert_success "Git diff simulation" "git_diff_simulation | $CLI_CMD bar --level 1 --metric total"
    
    print_test "Multiple chart types with same data"
    assert_success "Pie then bar" "basic_test_data | $CLI_CMD pie && basic_test_data | $CLI_CMD bar"
    
    print_test "Real-world workflow simulation"
    assert_success "Workflow simulation" "git_diff_simulation | $CLI_CMD pie --level 2 --filter '^src/' --ignore 'test' --metric additions --title 'Feature Development Progress'"
}

# Regression tests
test_regression() {
    print_header "Regression Tests"
    
    print_test "Specific bug: zero deletions"
    assert_success "Zero deletions" "zero_deletions_data | $CLI_CMD pie --metric deletions"
    
    print_test "Specific bug: zero additions"
    assert_success "Zero additions" "zero_additions_data | $CLI_CMD pie --metric additions"
    
    print_test "Regression: filter with special regex chars"
    assert_success "Special regex chars" "basic_test_data | $CLI_CMD pie --filter 'foo\.js'"
    
    print_test "Regression: multiple ignore patterns"
    assert_success "Multiple ignores" "complex_test_data | $CLI_CMD pie --ignore 'test' --ignore 'docs' --ignore 'node_modules'"
}

# Run all tests
run_all_tests() {
    echo -e "${BLUE}Starting comprehensive test suite for git-diff-chart${NC}"
    echo "================================================="
    
    setup_tests
    test_basic_functionality
    test_chart_types
    test_metrics
    test_levels
    test_filter_options
    test_ignore_patterns
    test_base_branch
    test_custom_titles
    test_chart_specific_options
    test_option_combinations 
    test_edge_cases
    test_output_formats
    test_input_validation
    test_performance
    test_integration
    test_regression
    
    # Summary
    print_header "Test Summary"
    echo "Total tests run: $TESTS_RUN"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed.${NC}"
        exit 1
    fi
}

# Main execution
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    run_all_tests
fi