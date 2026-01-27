import { describe, it, expect } from 'bun:test';
import { Writable } from 'stream';
import { createLabeledStream } from './stream-wrapper.js';

describe('createLabeledStream', () => {
  it('should prefix complete lines with agent role', async () => {
    const output: string[] = [];
    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    });

    const labeledStream = createLabeledStream('Dev', 'stdout', mockStream as any);

    labeledStream.write('Hello World\n');
    labeledStream.write('Second line\n');
    labeledStream.end();

    await new Promise((resolve) => labeledStream.on('finish', resolve));

    expect(output.length).toBe(2);
    expect(output[0]).toContain('[Dev]');
    expect(output[0]).toContain('Hello World');
    expect(output[1]).toContain('[Dev]');
    expect(output[1]).toContain('Second line');
  });

  it('should handle partial lines by buffering', async () => {
    const output: string[] = [];
    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    });

    const labeledStream = createLabeledStream('SM', 'stdout', mockStream as any);

    labeledStream.write('Partial');
    labeledStream.write(' line');
    labeledStream.write(' here\n');
    labeledStream.end();

    await new Promise((resolve) => labeledStream.on('finish', resolve));

    // Should only output once when newline is encountered
    expect(output.length).toBe(1);
    expect(output[0]).toContain('[SM]');
    expect(output[0]).toContain('Partial line here');
  });

  it('should handle multiple lines in single write', async () => {
    const output: string[] = [];
    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    });

    const labeledStream = createLabeledStream('Review', 'stdout', mockStream as any);

    labeledStream.write('Line 1\nLine 2\nLine 3\n');
    labeledStream.end();

    await new Promise((resolve) => labeledStream.on('finish', resolve));

    expect(output.length).toBe(3);
    expect(output[0]).toContain('[Review]');
    expect(output[0]).toContain('Line 1');
    expect(output[1]).toContain('[Review]');
    expect(output[1]).toContain('Line 2');
    expect(output[2]).toContain('[Review]');
    expect(output[2]).toContain('Line 3');
  });

  it('should label stderr with :ERR suffix', async () => {
    const output: string[] = [];
    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    });

    const labeledStream = createLabeledStream('Dev', 'stderr', mockStream as any);

    labeledStream.write('Error message\n');
    labeledStream.end();

    await new Promise((resolve) => labeledStream.on('finish', resolve));

    expect(output.length).toBe(1);
    expect(output[0]).toContain('[Dev:ERR]');
    expect(output[0]).toContain('Error message');
  });

  it('should flush remaining buffer on stream end', async () => {
    const output: string[] = [];
    const mockStream = new Writable({
      write(chunk, encoding, callback) {
        output.push(chunk.toString());
        callback();
      }
    });

    const labeledStream = createLabeledStream('Story Creator', 'stdout', mockStream as any);

    labeledStream.write('No newline at end');
    labeledStream.end();

    await new Promise((resolve) => labeledStream.on('finish', resolve));

    expect(output.length).toBe(1);
    expect(output[0]).toContain('[Story Creator]');
    expect(output[0]).toContain('No newline at end');
  });
});
