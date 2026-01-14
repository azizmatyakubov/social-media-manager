#!/bin/bash
# Test Runner Script for Social Media Manager
# Run this script to execute all tests

echo "==================================="
echo "  Social Media Manager Test Suite"
echo "==================================="
echo ""

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if jest is installed
if [ ! -f "node_modules/jest/bin/jest.js" ]; then
    echo "Jest not found. Installing..."
    npm install jest ts-jest @types/jest --save-dev
fi

echo "Running tests..."
echo ""

# Run tests with different options based on args
if [ "$1" == "--coverage" ]; then
    node node_modules/jest/bin/jest.js --coverage --runInBand
elif [ "$1" == "--watch" ]; then
    node node_modules/jest/bin/jest.js --watch
elif [ -n "$1" ]; then
    # Run specific test file
    node node_modules/jest/bin/jest.js --runInBand "$1"
else
    # Run all tests
    node node_modules/jest/bin/jest.js --runInBand
fi

exit_code=$?

echo ""
echo "==================================="
if [ $exit_code -eq 0 ]; then
    echo "  All tests passed!"
else
    echo "  Some tests failed (exit code: $exit_code)"
fi
echo "==================================="

exit $exit_code
