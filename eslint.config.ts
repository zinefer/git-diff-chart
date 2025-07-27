import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";

export default [
    // Base JavaScript configuration
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        ...js.configs.recommended,
        languageOptions: { 
            globals: globals.browser 
        }
    },
    
    // TypeScript configuration
    ...tseslint.configs.recommended,
    
    // Markdown configuration
    {
        files: ["**/*.md"],
        plugins: { 
            markdown 
        },
        processor: "markdown/markdown"
    },
    {
        files: ["**/*.md/*.{js,ts}"],
        ...markdown.configs.recommended
    }
];