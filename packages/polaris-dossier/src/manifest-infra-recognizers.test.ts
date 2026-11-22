import { beforeAll, describe, expect, it } from 'vitest';
import { isCMakeListsPath, recognizeCMakeLists } from './manifest-cmake.js';
import { isComposePath, recognizeCompose } from './manifest-compose.js';
import { isKubernetesPath, recognizeKubernetes } from './manifest-kubernetes.js';
import { isMakefilePath, recognizeMakefile } from './manifest-make.js';
import type { Recognized } from './manifest-model.js';
import { isTerraformPath, recognizeTerraform } from './manifest-terraform.js';
import { recognizeWorkflow } from './manifest-workflow.js';

// syzygy-3efd.26 (REQ-polaris-generation-034, infrastructure recognizers): golden fixtures for the five infrastructure recognizers, version 1. Each
// fixture's expected facts, line spans and parse faults are literals written from the fixture text before the recognizer ran, never read
// from its code. Per the qualification minimum: for compose-file a file of several services with image, ports in each of its three
// element forms and depends_on in both forms; for kubernetes-manifest a stream of several documents, one an object with a name, one
// without, one empty and one that is no object; for terraform-configuration resource and module blocks beside skipped blocks and a
// heredoc; for makefile rules, special targets, pattern rules, assignments, target-specific assignments, conditionals and a define body,
// and a file of a function call; for cmake-lists a project and targets of the three kinds with quoted, bracket and unquoted arguments;
// and for each a malformed file and an empty file. Beside them, each fault the recognizer states and each path rule's boundary.

type Fact = [kind: string, first: number, last: number, ...values: (string | null)[]];
/** The recognizer's facts as compact literals: kind, first line, last line, then the members' values in order. */
const facts = (result: Recognized): Fact[] | string => {
  if (!result.ok) return result.parseFault;
  return result.facts.map((f) => [f.fact, f.lines.first, f.lines.last, ...f.values] as Fact);
};

/** Fixture texts are built in beforeAll, so a mutant that throws while one is built fails a test rather than the collection. */
const F: Record<string, string> = {};
beforeAll(() => {
  const nested = (depth: number): string => `${'a {\n'.repeat(depth)}${'}\n'.repeat(depth)}`;
  Object.assign(F, {
    composeServices: [
      'services:',
      '  web:',
      '    image: nginx:${TAG}',
      '    ports:',
      '      - "8080:80"',
      '      - 443',
      '      - target: 9000',
      '        published: "9001"',
      '    depends_on: [db]',
      '  db:',
      '    depends_on:',
      '      cache:',
      '        condition: service_healthy',
      '',
    ].join('\n'),
    composeTargetOnly: 'services:\n  a:\n    ports:\n      - target: "80"\n      - 0x1F\n',
    composeNoServices: 'name: x\nvolumes: {}\n',
    composeServicesSequence: 'services:\n  - web\n',
    composeMergeKey: 'x-defaults: &defaults\n  image: a\nservices:\n  web:\n    <<: *defaults\n',
    composeEmpty: '',
    composeWhitespace: '  \n\n',
    composeCommentOnly: '# only a comment\n',
    composeRootSequence: '- a\n',
    composePortNoTarget: 'services:\n  a:\n    ports:\n      - published: 80\n',
    composePortFloat: 'services:\n  a:\n    ports:\n      - 80.5\n',
    composeImageInteger: 'services:\n  a:\n    image: 5\n',
    composeServiceNull: 'services:\n  a:\n',
    composeDependsScalar: 'services:\n  a:\n    depends_on: b\n',
    composeRepeatedService: 'services:\n  a: {}\n  a: {}\n',
    composeRepeatedUnread: 'services: {}\nx:\n  k: 1\n  k: 2\n',
    composeSecondDocument: 'services: {}\n---\nservices: {}\n',
    k8sStream: [
      'apiVersion: apps/v1',
      'kind: Deployment',
      'metadata:',
      '  name: api',
      '  labels: {app: api}',
      '# trailing comment',
      '---',
      '---',
      'apiVersion: v1',
      'kind: Service',
      'spec:',
      '  ports: [80]',
      '---',
      '- not',
      '- an object',
      '---',
      'note: no kind here',
      '',
    ].join('\n'),
    k8sValues: 'replicaCount: 1\nimage:\n  tag: x\n',
    k8sKindInteger: 'apiVersion: v1\nkind: 5\n',
    k8sMetadataScalar: 'apiVersion: v1\nkind: Pod\nmetadata: x\n',
    k8sNameInteger: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: 7\n',
    k8sRepeatedName: 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: a\n  name: b\n',
    k8sRepeatedKind: 'apiVersion: v1\nkind: Pod\nkind: Pod\n',
    k8sAnchor: 'apiVersion: v1\nkind: &k Pod\n',
    k8sEmpty: '',
    k8sMalformed: 'apiVersion: v1\nkind: [Pod\n',
    tfMain: [
      'terraform {',
      '  required_version = ">= 1.5"',
      '}',
      '',
      '# a comment',
      'resource "aws_instance" "web" {',
      '  ami  = "ami-123"',
      '  tags = {',
      '    Name = "web-${var.env}"',
      '  }',
      '  user_data = <<-EOT',
      '    #!/bin/sh',
      '    resource "x" "y" {',
      '  EOT',
      '}',
      '',
      '/* a block',
      '   comment */',
      'module "vpc" {',
      '  source = "./modules/vpc"',
      '  cidr   = "10.0.0.0/16"',
      '}',
      '',
      'variable "env" {',
      '  default = "dev"',
      '}',
      '',
      'data "aws_ami" "x" {}',
      '',
      'resource aws_s3_bucket logs {',
      '  bucket = format("%s-logs", var.env) // trailing',
      '  lifecycle {',
      '    ignore_changes = [',
      '      tags,',
      '    ]',
      '  }',
      '}',
      '',
    ].join('\n'),
    tfEscapedSource: 'module "m" {\n  source = "./a\\"b$${x}"\n}\n',
    tfTemplateString: 'locals {\n  a = "${join(",", ["x", "}"])}"\n}\nresource "a" "b" {}\n',
    tfHeredocPlain: 'locals {\n  a = <<EOF\nmodule "z" {\nEOF\n}\n',
    tfUnterminatedString: 'resource "aws_instance" "web {\n}\n',
    tfUnterminatedHeredoc: 'locals {\n  a = <<EOF\nx\n}\n',
    tfUnterminatedComment: '/* x\nresource "a" "b" {}\n',
    tfUnbalancedBrace: 'resource "a" "b" {\n',
    tfUnbalancedBracket: 'locals {\n  a = [1, 2\n}\n',
    tfStrayClose: '}\n',
    tfStrayText: 'resource "a" "b" {}\n!\n',
    tfRepeatedAttribute: 'resource "a" "b" {\n  x = 1\n  x = 2\n}\n',
    tfModuleNoSource: 'module "vpc" {\n  cidr = "10.0.0.0/16"\n}\n',
    tfModuleRepeatedSource: 'module "vpc" {\n  source = "./a"\n  source = "./b"\n}\n',
    tfModuleTemplateSource: 'module "vpc" {\n  source = "./m/${var.x}"\n}\n',
    tfModuleExpressionSource: 'module "vpc" {\n  source = var.x\n}\n',
    tfModuleTwoLabels: 'module "a" "b" {\n  source = "./a"\n}\n',
    tfResourceOneLabel: 'resource "a" {\n}\n',
    tfDepth256: nested(255).replace(/^/u, 'resource "r" "n" {\n').replace(/$/u, '}\n'),
    tfDepth257: nested(256).replace(/^/u, 'resource "r" "n" {\n').replace(/$/u, '}\n'),
    tfEmpty: '',
    tfWhitespace: '\n  \n',
    tfBom: '\ufeffresource "a" "b" {}\n',
    makeRules: [
      'CC := gcc',
      '.PHONY: build test',
      'build: deps',
      '\t$(CC) -o app main.c',
      '\tdeploy: x',
      '',
      'test:: build',
      '\t./run-tests',
      '%.o: %.c',
      '\t$(CC) -c $<',
      '$(BIN): main.o',
      'build: CFLAGS += -O2',
      'ifeq ($(OS),Linux)',
      'build: linux-deps',
      'else',
      'install: build',
      'endif',
      'define HELP',
      'help: not a rule',
      'endef',
      'A := b: c',
      'lint: \\',
      '  src',
      '-include local.mk',
      'export PATH := $(PATH):/opt # a comment',
      '',
    ].join('\n'),
    makeScenario: '.PHONY: build test\nbuild: deps\n\tdeploy: x\ntest:: build\n%.o: %.c\n$(BIN): main.o\nCC := gcc\nbuild: CFLAGS += -O2\nifeq ($(CC),gcc)\nbuild: other\nendif\n',
    makeFunctionCall: 'all: x\n$(eval $(call rule,x))\n',
    makeRecipeFirst: '\techo hi\nall:\n',
    makeUnterminatedDefine: 'define X\nfoo\n',
    makeStrayEndif: 'endif\n',
    makeStrayEndef: 'endef\n',
    makeStrayElse: 'else\n',
    makeOpenConditional: 'ifdef X\nall:\n',
    makeUnbalanced: 'all: $(foo\n',
    makeWords: 'just some words\n',
    makeRecipePrefix: '.RECIPEPREFIX = >\nall: x\n',
    makeEmpty: '',
    makeBom: '\ufeffall:\n',
    cmakeLists: [
      'cmake_minimum_required(VERSION 3.20)',
      'project("Kestrel Core" VERSION 1.0 LANGUAGES CXX)',
      '# a comment',
      '#[[ a bracket',
      'comment ]]',
      'add_executable(kestrel main.cpp)',
      'if(BUILD_TOOLS)',
      '  ADD_LIBRARY([=[kestrel_[core]]=] STATIC',
      '    src/a.cpp',
      '  )',
      'endif()',
      'add_custom_target(docs ALL COMMAND echo "a\\tb" (nested))',
      'add_library(${PROJECT_NAME}_util src/u.cpp)',
      'project(line\\;one)',
      'add_custom_target("a \\',
      'b")',
      '',
    ].join('\n'),
    cmakeUnterminatedQuote: 'project("x\n',
    cmakeUnterminatedBracket: 'project([[x\n',
    cmakeUnterminatedComment: '#[[ x\nproject(a)\n',
    cmakeUnterminatedParen: 'project(a\n',
    cmakeNoParen: 'project a\n',
    cmakeNoArgument: 'add_library()\n',
    cmakeBadEscape: 'project(a\\qb)\n',
    cmakeEmpty: '',
    cmakeBom: '\ufeffproject(a)\n',
  });
});

describe('compose-file version 1', () => {
  it('names exactly the eight Compose file names, never a workflow path', () => {
    expect([
      'compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml', 'compose.override.yaml', 'compose.override.yml',
      'docker-compose.override.yaml', 'deploy/docker-compose.override.yml', 'compose.prod.yml', 'Compose.yml', 'docker-compose.json',
      '.github/workflows/compose.yml', 'a/.github/workflows/compose.yml',
    ].map(isComposePath)).toEqual([true, true, true, true, true, true, true, true, false, false, false, false, true]);
  });
  it('reads services, an image as written, ports in their three forms and depends_on in both forms (scenario fixture)', () => {
    expect(facts(recognizeCompose(F['composeServices']!))).toEqual([
      ['service', 2, 9, 'web'], ['service-image', 3, 3, 'web', 'nginx:${TAG}'],
      ['service-port', 5, 5, 'web', '8080:80'], ['service-port', 6, 6, 'web', '443'], ['service-port', 7, 8, 'web', '9001:9000'],
      ['service-depends-on', 9, 9, 'web', 'db'],
      ['service', 10, 13, 'db'], ['service-depends-on', 12, 13, 'db', 'cache'],
    ]);
  });
  it('writes a port mapping without published as its target, and keeps a hexadecimal integer\'s text', () => {
    expect(facts(recognizeCompose(F['composeTargetOnly']!))).toEqual([['service', 2, 5, 'a'], ['service-port', 4, 4, 'a', '80'], ['service-port', 5, 5, 'a', '0x1F']]);
  });
  it('reads a file with no services as Inferred with zero facts', () => {
    expect(facts(recognizeCompose(F['composeNoServices']!))).toEqual([]);
  });
  it('refuses an empty and a whitespace-only file as syntax, and a comment-only file (a null root) as field-type', () => {
    expect(facts(recognizeCompose(F['composeEmpty']!))).toBe('syntax');
    expect(facts(recognizeCompose(F['composeWhitespace']!))).toBe('syntax');
    expect(facts(recognizeCompose(F['composeCommentOnly']!))).toBe('field-type');
  });
  it('refuses a wrong-typed services, service, image, port, port mapping or depends_on as field-type', () => {
    expect(facts(recognizeCompose(F['composeServicesSequence']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composeRootSequence']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composePortNoTarget']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composePortFloat']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composeImageInteger']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composeServiceNull']!))).toBe('field-type');
    expect(facts(recognizeCompose(F['composeDependsScalar']!))).toBe('field-type');
  });
  it('refuses a repeated service as duplicate-key, a repeated unread key as syntax, and a merge key or second document as beyond-reader', () => {
    expect(facts(recognizeCompose(F['composeRepeatedService']!))).toBe('duplicate-key');
    expect(facts(recognizeCompose(F['composeRepeatedUnread']!))).toBe('syntax');
    expect(facts(recognizeCompose(F['composeMergeKey']!))).toBe('beyond-reader');
    expect(facts(recognizeCompose(F['composeSecondDocument']!))).toBe('beyond-reader');
  });
  it('refuses a repeated key in a depends_on mapping as duplicate-key, a mapping it reads', () => {
    expect(facts(recognizeCompose('services:\n  web:\n    depends_on:\n      db: {}\n      db: {}\n'))).toBe('duplicate-key');
  });
  it('leaves a workflow\'s reading unchanged: a second document is still beyond-reader for a workflow', () => {
    expect(facts(recognizeWorkflow('on: push\n---\non: push\n'))).toBe('beyond-reader');
  });
});

describe('kubernetes-manifest version 1', () => {
  it('names YAML files under a conventional directory, never under templates, a workflow path or a Compose file name', () => {
    expect([
      'k8s/deployment.yaml', 'deploy/k8s/app.yml', 'kubernetes/ingress.yaml', 'manifests/x.yaml', 'kube/a.yaml', 'deployment/a.yml',
      'deployments/a.yaml', 'kustomize/base/kustomization.yaml', 'charts/app/templates/deployment.yaml', 'deploy/chart/templates/svc.yaml',
      'k8s.yaml', 'k8s/.yaml', 'k8s/a.json', 'app/k8s', 'deploy/docker-compose.yml', 'K8s/a.yaml', 'src/app.yaml',
    ].map(isKubernetesPath)).toEqual([true, true, true, true, true, true, true, true, false, false, false, false, false, false, false, false, false]);
  });
  it('reads a stream: an object with a name, one without, an empty document, one that is no object and a mapping with no kind', () => {
    expect(facts(recognizeKubernetes(F['k8sStream']!))).toEqual([['kubernetes-object', 1, 5, 'Deployment', 'api'], ['kubernetes-object', 9, 12, 'Service', null]]);
  });
  it('reads a values file of no Kubernetes object as Inferred with zero facts', () => {
    expect(facts(recognizeKubernetes(F['k8sValues']!))).toEqual([]);
  });
  it('takes no fact from a document lacking apiVersion, whatever else it holds', () => {
    expect(facts(recognizeKubernetes('kind: Service\nmetadata:\n  name: api\n'))).toEqual([]);
  });
  it('refuses a wrong-typed kind, metadata or name as field-type', () => {
    expect(facts(recognizeKubernetes(F['k8sKindInteger']!))).toBe('field-type');
    expect(facts(recognizeKubernetes(F['k8sMetadataScalar']!))).toBe('field-type');
    expect(facts(recognizeKubernetes(F['k8sNameInteger']!))).toBe('field-type');
  });
  it('refuses a repeated name or kind as duplicate-key, an anchor as beyond-reader, and a malformed or empty file as syntax', () => {
    expect(facts(recognizeKubernetes(F['k8sRepeatedName']!))).toBe('duplicate-key');
    expect(facts(recognizeKubernetes(F['k8sRepeatedKind']!))).toBe('duplicate-key');
    expect(facts(recognizeKubernetes(F['k8sAnchor']!))).toBe('beyond-reader');
    expect(facts(recognizeKubernetes(F['k8sMalformed']!))).toBe('syntax');
    expect(facts(recognizeKubernetes(F['k8sEmpty']!))).toBe('syntax');
  });
});

describe('terraform-configuration version 1', () => {
  it('names .tf files only, never .tf.json, .tfvars, .tfstate or a lock file', () => {
    expect([
      'main.tf', 'infra/main.tf', 'infra/modules/vpc/variables.tf', '.tf', 'infra/x.tf.json', 'terraform.tfvars', 'infra/x.auto.tfvars',
      'terraform.tfstate', 'infra/terraform.tfstate.backup', 'infra/.terraform.lock.hcl', 'main.TF',
    ].map(isTerraformPath)).toEqual([true, true, true, false, false, false, false, false, false, false, false]);
  });
  it('reads top-level resource and module blocks beside skipped blocks, comments and a heredoc that looks like a block', () => {
    expect(facts(recognizeTerraform(F['tfMain']!))).toEqual([
      ['terraform-resource', 6, 15, 'aws_instance', 'web'],
      ['terraform-module', 19, 22, 'vpc', './modules/vpc'],
      ['terraform-resource', 30, 37, 'aws_s3_bucket', 'logs'],
    ]);
  });
  it('decodes a module source\'s escapes, reads strings nested in a template, and never reads a heredoc body as a block', () => {
    expect(facts(recognizeTerraform(F['tfEscapedSource']!))).toEqual([['terraform-module', 1, 3, 'm', './a"b${x}']]);
    expect(facts(recognizeTerraform(F['tfTemplateString']!))).toEqual([['terraform-resource', 4, 4, 'a', 'b']]);
    expect(facts(recognizeTerraform(F['tfHeredocPlain']!))).toEqual([]);
  });
  it('refuses an unterminated string, heredoc or comment, an unbalanced bracket, a repeated attribute and stray text as syntax', () => {
    for (const name of ['tfUnterminatedString', 'tfUnterminatedHeredoc', 'tfUnterminatedComment', 'tfUnbalancedBrace', 'tfUnbalancedBracket', 'tfStrayClose', 'tfStrayText', 'tfRepeatedAttribute', 'tfBom']) {
      expect([name, facts(recognizeTerraform(F[name]!))]).toEqual([name, 'syntax']);
    }
  });
  it('refuses a module repeating an attribute as duplicate-key, and a module or resource of the wrong form as field-type', () => {
    expect(facts(recognizeTerraform(F['tfModuleRepeatedSource']!))).toBe('duplicate-key');
    for (const name of ['tfModuleNoSource', 'tfModuleTemplateSource', 'tfModuleExpressionSource', 'tfModuleTwoLabels', 'tfResourceOneLabel']) {
      expect([name, facts(recognizeTerraform(F[name]!))]).toEqual([name, 'field-type']);
    }
  });
  it('refuses a resource of three labels as field-type, reads past a // comment, and takes field-type before beyond-reader', () => {
    expect(facts(recognizeTerraform('resource "a" "b" "c" {\n}\n'))).toBe('field-type');
    expect(facts(recognizeTerraform('// resource "x" "y" {\nresource "a" "b" {}\n'))).toEqual([['terraform-resource', 2, 2, 'a', 'b']]);
    expect(facts(recognizeTerraform(`resource "r" {\n${'a {\n'.repeat(256)}${'}\n'.repeat(257)}`))).toBe('field-type');
  });
  it('reads blocks nested 256 deep and refuses 257 as beyond-reader', () => {
    expect(facts(recognizeTerraform(F['tfDepth256']!))).toEqual([['terraform-resource', 1, 512, 'r', 'n']]);
    expect(facts(recognizeTerraform(F['tfDepth257']!))).toBe('beyond-reader');
  });
  it('reads an empty or whitespace-only file as Inferred with zero facts', () => {
    expect(facts(recognizeTerraform(F['tfEmpty']!))).toEqual([]);
    expect(facts(recognizeTerraform(F['tfWhitespace']!))).toEqual([]);
  });
});

describe('makefile version 1', () => {
  it('names exactly Makefile, makefile and GNUmakefile', () => {
    expect(['Makefile', 'src/Makefile', 'makefile', 'tools/GNUmakefile', 'rules.mk', 'Makefile.am', 'Makefile.in', 'MAKEFILE'].map(isMakefilePath))
      .toEqual([true, true, true, true, false, false, false, false]);
  });
  it('reads one fact per distinct literal target, at its first rule, and none from special, pattern, variable or recipe targets', () => {
    expect(facts(recognizeMakefile(F['makeRules']!))).toEqual([
      ['make-target', 3, 3, 'build'], ['make-target', 7, 7, 'test'], ['make-target', 16, 16, 'install'], ['make-target', 22, 23, 'lint'],
    ]);
  });
  it('reads exactly build and test from the scenario fixture', () => {
    expect(facts(recognizeMakefile(F['makeScenario']!))).toEqual([['make-target', 2, 2, 'build'], ['make-target', 4, 4, 'test']]);
  });
  it('keeps recipe context across conditional-directive lines, so recipe text inside a conditional is never a rule (scenario "Makefile recipe inside a conditional")', () => {
    expect(facts(recognizeMakefile('build:\nifdef V\n\tscp out host:/srv\nendif\n'))).toEqual([['make-target', 1, 1, 'build']]);
    expect(facts(recognizeMakefile('build:\nifeq ($(X),1)\n\t@echo "mode: one"\nendif\n'))).toEqual([['make-target', 1, 1, 'build']]);
    expect(facts(recognizeMakefile('build:\n\techo start\nifeq ($(V),1)\n\tscp out host:/srv\nelse\n\tcp out /srv\nendif\n'))).toEqual([['make-target', 1, 1, 'build']]);
    // An ordinary line still ends it.
    expect(facts(recognizeMakefile('build:\nA = 1\n\tscp out host:/srv\n'))).toBe('syntax');
  });
  it('refuses a tab-led line that is no recipe line as syntax (scenario "Makefile tab-led line that is no recipe line")', () => {
    expect(facts(recognizeMakefile('A = 1\n\tscp out host:/srv\nbuild:\n'))).toBe('syntax');
    expect(facts(recognizeMakefile('build:\n\tscp out host:/srv\nA = 1\n'))).toEqual([['make-target', 1, 1, 'build']]);
    // A continuation line belongs to its logical line, whatever it begins with.
    expect(facts(recognizeMakefile('SRC = a \\\n\tb\nbuild: $(SRC)\n'))).toEqual([['make-target', 3, 3, 'build']]);
  });
  it('takes no fact from a target-specific assignment, and no recipe follows one', () => {
    expect(facts(recognizeMakefile('all: x\nprog: CFLAGS = -O2\n'))).toEqual([['make-target', 1, 1, 'all']]);
    expect(facts(recognizeMakefile('prog: CFLAGS = -O2\n\techo\n'))).toBe('syntax');
  });
  it('refuses a function call and an assignment to .RECIPEPREFIX as beyond-reader', () => {
    expect(facts(recognizeMakefile(F['makeFunctionCall']!))).toBe('beyond-reader');
    expect(facts(recognizeMakefile(F['makeRecipePrefix']!))).toBe('beyond-reader');
  });
  it('refuses a recipe before any rule, an unmatched define, endif, endef or else, an open conditional, an unbalanced reference and stray words as syntax', () => {
    for (const name of ['makeRecipeFirst', 'makeUnterminatedDefine', 'makeStrayEndif', 'makeStrayEndef', 'makeStrayElse', 'makeOpenConditional', 'makeUnbalanced', 'makeWords', 'makeBom']) {
      expect([name, facts(recognizeMakefile(F[name]!))]).toEqual([name, 'syntax']);
    }
  });
  it('reads an empty file as Inferred with zero facts', () => {
    expect(facts(recognizeMakefile(F['makeEmpty']!))).toEqual([]);
  });
});

describe('cmake-lists version 1', () => {
  it('names exactly CMakeLists.txt', () => {
    expect(['CMakeLists.txt', 'src/CMakeLists.txt', 'cmake/Find.cmake', 'CMakeLists.TXT', 'cmakelists.txt'].map(isCMakeListsPath)).toEqual([true, true, false, false, false]);
  });
  it('reads a project and targets of the three kinds with quoted, bracket and unquoted arguments, wherever they stand', () => {
    expect(facts(recognizeCMakeLists(F['cmakeLists']!))).toEqual([
      ['cmake-project', 2, 2, 'Kestrel Core'],
      ['cmake-target', 6, 6, 'kestrel', 'executable'],
      ['cmake-target', 8, 10, 'kestrel_[core]', 'library'],
      ['cmake-target', 12, 12, 'docs', 'custom'],
      ['cmake-target', 13, 13, '${PROJECT_NAME}_util', 'library'],
      ['cmake-project', 14, 14, 'line\\;one'],
      ['cmake-target', 15, 16, 'a b', 'custom'],
    ]);
  });
  it('refuses an unterminated quoted or bracket argument, bracket comment or parenthesis, a bad escape and text not an invocation as syntax', () => {
    for (const name of ['cmakeUnterminatedQuote', 'cmakeUnterminatedBracket', 'cmakeUnterminatedComment', 'cmakeUnterminatedParen', 'cmakeNoParen', 'cmakeBadEscape', 'cmakeBom']) {
      expect([name, facts(recognizeCMakeLists(F[name]!))]).toEqual([name, 'syntax']);
    }
  });
  it('drops a bracket argument\'s first line end, as cmake-language(7) states, keeping its later ones', () => {
    expect(facts(recognizeCMakeLists('project([[\nKestrel]])\n'))).toEqual([['cmake-project', 1, 2, 'Kestrel']]);
    expect(facts(recognizeCMakeLists('project([=[\r\n\nK]=])\n'))).toEqual([['cmake-project', 1, 3, '\nK']]);
  });
  it('refuses an invocation followed on its line by anything but white space or a comment as syntax', () => {
    expect(facts(recognizeCMakeLists('project(a) add_executable(b x.c)\n'))).toBe('syntax');
    expect(facts(recognizeCMakeLists('project(a)x\n'))).toBe('syntax');
    expect(facts(recognizeCMakeLists('project(a) #[[c]] project(b)\n'))).toBe('syntax');
    expect(facts(recognizeCMakeLists('project(a) \t#[[c]] # note\nadd_executable(b x.c)'))).toEqual([['cmake-project', 1, 1, 'a'], ['cmake-target', 2, 2, 'b', 'executable']]);
  });
  it('keeps an inner quote of an unquoted argument as written', () => {
    expect(facts(recognizeCMakeLists('add_executable(a"b" x.c)\n'))).toEqual([['cmake-target', 1, 1, 'a"b"', 'executable']]);
  });
  it('refuses a target command with no argument as field-type, and reads an empty file as Inferred with zero facts', () => {
    expect(facts(recognizeCMakeLists(F['cmakeNoArgument']!))).toBe('field-type');
    expect(facts(recognizeCMakeLists(F['cmakeEmpty']!))).toEqual([]);
  });
});
