#!/bin/zsh

INCLUDE_PATHS=(
  # "*"
  # ".github"
  # "docs"
  # "scripts"
  # "src"
  "src"
  # "tests"
)

IGNORE_PATHS=(
  ".gitignore"
  "new-*.md"
  "TODO.md"
  "output"
  ".output"
  ".vinxi"
  "docker-analysis-*.md"
  "build-analysis"
  # "**/*.css"
  # "**/*.module.css"
)

INCLUDE_STRING=$(IFS=,; echo "${INCLUDE_PATHS[*]}")
IGNORE_STRING=$(IFS=,; echo "${IGNORE_PATHS[*]}")

INSTRUCTION_FILE="repomix-instruction.md"
TEMP_DIR=""

if [ ! -f "$INSTRUCTION_FILE" ]; then
  TEMP_DIR=$(mktemp -d)
  INSTRUCTION_FILE="$TEMP_DIR/repomix-instruction-temp.md"

  cat > "$INSTRUCTION_FILE" << 'EOF'
I'm going to ask you to refactor my code, write a new feature, or fix a bug.

- How to respond
  - In your responses when you respond with code, you will respond with the entire code files with no comments.
  - Do not include any comments in the code at all.
  - Only respond with code files if there are changes (either additions or subtractions), do not respond with code files that are identical to the code files I gave you.
  - Aside from the instructions above and given below, you will not make any changes to the code files. You will only add or remove code specific to the requested refactor, feature, or bug fix.

- Do not respond with code in your first response, in your first response you will provide a complete and comprehensive list of the following:
  - The new files with their file paths and file names and file extensions that will be created
  - The existing files and their paths, names, and extensions that will be modified
  - The existing files and their paths, names, and extensions that will be deleted

- Logging
  - Any time you are refactoring, building a new feature, or fixing a bug, add a few logging functions to track what is happening and help debug when the application fails.
  - All logging should import `l` and use it like `l.warn()`, `l.info()`, etc.

- JavaScript, TypeScript, and Bun coding guidelines
  - Always use ESM, async/await, try catch, and the latest version of Node.js (22 as of now).
    - Avoid for and while loops in favor of map functions.
    - Avoid if-else statements unless very minimal and when no other appropriate solutions exist.
    - Do not use nodemon, jest, or dotenv, use all built in Node.js utilities
  - Do not use ts-node and do not include a build step at all, use tsx for running all TypeScript files
  - Do not use semi-colons.
  - Always write `.ts` files with TypeScript. Infer types whenever possible, when types must be declared keep them minimal and inlined instead of named. Always include return types.
  - Never use JavaScript or TypeScript classes, only use functions.
  - Use all Bun APIs, if anything cannot be done with Bun APIs default to using the shell extension instead of Node modules like `fs` or `path`.
  - Do not download a third party library unless explicitly told to do so with a specific library.

- Docs
  - Make the doc files in `docs` very concise and focus solely on how to use the commands that are available.
  - If a command is performing a series of steps that could be manually executed individually, do not provide those steps.
  - It should be assumed that all the commands will work as intended and nothing will need to be done manually.
  - Get rid of any extra information about the tools not related to how they are used in the project.
  - Get rid of troubleshooting steps that are unlikely to be needed if the commands are working correct.

- Code files always inlined in chat
EOF

  echo "Created temporary instruction file: $INSTRUCTION_FILE"
fi

OUTPUT_FILE="new-llm-1.md"
COUNTER=2

while [ -f "$OUTPUT_FILE" ]; do
  OUTPUT_FILE="new-llm-$COUNTER.md"
  COUNTER=$((COUNTER + 1))
done

npx repomix \
  --instruction-file-path "$INSTRUCTION_FILE" \
  --include "$INCLUDE_STRING" \
  --ignore "$IGNORE_STRING" \
  --style markdown \
  --output "$OUTPUT_FILE" \
  --token-count-encoding "o200k_base" \
  --top-files-len 40 \
  --no-git-sort-by-changes \
  --no-file-summary \
  --no-security-check

EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
  echo "Successfully created $OUTPUT_FILE"
else
  echo "Error running repomix command"
fi

if [ -n "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
  echo "Removed temporary directory and instruction file"
fi

exit $EXIT_CODE