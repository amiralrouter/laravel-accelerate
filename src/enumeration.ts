import * as fs from 'fs';

import Laravelbase from "./laravelbase";

export default class Enumeration {
    source_code: string[] = [];

    constructor(class_name: string) {

        const laravelbase = new Laravelbase();


        const file_path = laravelbase
            .add(['app', 'Enums'])
            .add(class_name + '.php')
            .getPath();

        this.source_code = fs.readFileSync(file_path, 'utf8').split('\n');

    }

    getType() {
        // find line which contains 'enum'
        const enum_line = this.source_code.find(line => line.includes('enum'));
        if (!enum_line) return '';

        // get string after ':' by regex
        const match = enum_line.match(/\:\s*(\w+)/);
        if (!match) return '';

        return match[1];
    }

    getInnerCodeLines(): string[] {
        // get lines which contains 'case'
        const inner_code_lines = this.source_code.filter(line => line.includes('case'));
        if (!inner_code_lines) return [];

        return inner_code_lines;
    }

    getKeys(): string[] {
        const results: string[] = [];
        const inner_code_lines = this.getInnerCodeLines();
        if (!inner_code_lines) return [];

        inner_code_lines.forEach(line => {
            const match = line.match(/case\s*(\w+)/);
            if (!match) return;
            results.push(match[1]);
        });

        return results;
    }

    getValues(): string[] {
        const results: string[] = [];
        const inner_code_lines = this.getInnerCodeLines();
        if (!inner_code_lines) return [];

        inner_code_lines.forEach(line => {
            const match = line.match(/=\s*['|"]?(.*?)['|"]?\s*;/);
            if (!match) return;
            results.push(match[1]);
        });

        return results;
    }
}