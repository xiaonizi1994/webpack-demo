const fs = require("fs");
const path = require("path");
const Parser = require("./Parser");
class Compiler {
    constructor(options) {
        const { entry, output } = options;
        this.entry = entry;
        this.output = output;
        this.modules = [];
    }
    // 构建启动
    run() {
        const info = this.build(this.entry);
        this.modules.push(info);
        this.modules.forEach(({ dependencies }) => {
            if (dependencies) {
                for (const dependency in dependencies) {
                    this.modules.push(this.build(dependencies[dependency]));
                }
            }
        });
        const dependencyGraph = this.modules.reduce(
            (graph, item) => ({
                ...graph,
                [item.filename]: {
                    dependencies: item.dependencies,
                    code: item.code
                }
            }),
            {}
        );
        this.generate(dependencyGraph);
    }
    build(filename) {
        const { getAst, getDependencies, getCode } = Parser;
        const ast = getAst(filename);
        const dependencies = getDependencies(ast, filename);
        const code = getCode(ast);
        return {
            filename,
            dependencies,
            code
        };
    }
    generate(code) {
        const filePath = path.join(this.output.path, this.output.filename);
        const bundle = `(function(graph){
      function require(moduleId){ 
        function localRequire(relativePath){
          return require(graph[moduleId].dependencies[relativePath])
        }
        var exports = {};
        (function(require,exports,code){
          eval(code)
        })(localRequire,exports,graph[moduleId].code);
        return exports;
      }
      require('${this.entry}')
    })(${JSON.stringify(code)})`;
        fs.writeFileSync(filePath, bundle, "utf-8");
    }
}

module.exports = Compiler;