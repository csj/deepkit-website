import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { ModuleKind, ScriptTarget, transpile } from 'typescript';
import * as type from '@deepkit/type';
import { ClassSchema, getGlobalStore } from '@deepkit/type';
import * as orm from '@deepkit/orm';
import { Database } from '@deepkit/orm';
import * as DeepkitSQLite from '@deepkit/sqlite';
import * as sqlJs from './sql-js-adapter';
import { ClassType } from '@deepkit/core';
import type { editor } from 'monaco-editor';
import { SQLDatabaseAdapter } from '@deepkit/sql';
import { isPlatformBrowser } from '@angular/common';
import { SQLiteConnection } from '@deepkit/sqlite';

@Component({
    selector: 'orm-playground',
    template: `
        <div class="wrapper">
            <div class="layout">
                <div #container></div>
                <div class="browser">
                    <div class="actions">
                        <div style="display: flex; align-items: center">
                            <button class="primary" style="font-size: 13px; line-height: 15px;" (click)="transpile()">Run</button>
                        </div>

                        <div class="tabs">
                            <button class="tab" [class.active]="tab === 'list'" (click)="openTab('list')">Tables</button>
                            <button class="tab" [class.active]="tab === 'sql'" (click)="openTab('sql')">SQL</button>
                        </div>
                    </div>
                    <div class="content">
                        <div class="tables" *ngIf="tab === 'list'">
                            <table *ngFor="let table of tables; trackBy: trackByIndex">
                                {{table.name}}
                                <tr>
                                    <th *ngFor="let name of table.columns; trackBy: trackByIndex">
                                        {{name}}
                                    </th>
                                </tr>
                                <tr *ngFor="let row of table.items; trackBy: trackByIndex">
                                    <td *ngFor="let name of table.columns; trackBy: trackByIndex">
                                        {{row[name] === undefined ? 'undefined' : (row[name]|json)}}
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <div class="dql" *ngIf="tab === 'sql'">
                            <div codeHighlight="sql" [code]="dql"></div>
                        </div>
                    </div>
                    <div class="console">
                        <div *ngFor="let log of logs; trackBy: trackByIndex">{{log}}</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styleUrls: ['./orm-playground.component.scss']
})
export class OrmPlaygroundComponent implements AfterViewInit, OnDestroy {
    ts: string = `
import {Database} from '@deepkit/orm';
import {t, entity} from '@deepkit/type';
import {SQLiteDatabaseAdapter} from '@deepkit/sqlite';

@entity.name('user')
class User {
    @t.primary.autoIncrement id: number = 0;
    @t createdAt: Date = new Date;
    @t lastName?: string;
    @t firstName?: string;
    constructor(
       @t public username: string
    ) {}
}

const database = new Database(new SQLiteDatabaseAdapter(), [User]);
await database.migrate();

await database.persist(new User('Peter'), new User('Daniel'), new User('Marie'));

const items = await database.query(User).select('username').find();
console.log('items', items);

console.log('ids', await database.query(User).findField('id'));

    `.trim();
    js: string = '';
    dql: string = '';

    tab: string = 'list';

    tables: { name: string, items: any[], columns: string[] }[] = [];

    @ViewChild('container') container?: ElementRef;

    protected databases: Database[] = [];

    protected editor?: editor.IStandaloneCodeEditor;

    public logs: string[] = [];
    protected isBrowser: boolean = true;

    constructor(
        protected cd: ChangeDetectorRef,
        @Inject(PLATFORM_ID) protected platformId: any,
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    openTab(tab: string) {
        this.tab = tab;
        this.cd.detectChanges();
    }

    trackByIndex(index: number) {
        return index;
    }

    ngOnDestroy(): void {
        if (this.editor) {
            this.editor.dispose();
        }
    }

    async ngAfterViewInit() {
        if (!this.isBrowser) {
            return;
        }

        let Sqlite3: any;
        if (this.container) {
            (window as any)._require.config({ paths: { vs: `monaco-editor/vs` } });
            (window as any)._require(['vs/editor/editor.main'], (monaco: any) => {
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: true,
                    noSyntaxValidation: true,
                });

                this.editor = monaco.editor.create(this.container!.nativeElement, {
                    roundedSelection: false,
                    renderLineHighlight: 'all',
                    automaticLayout: true,
                    minimap: {
                        enabled: false,
                    },
                    value: this.ts,
                    theme: 'vs-dark',
                    language: 'typescript',
                });

                if (Sqlite3) this.transpile();
            });
        }

        Sqlite3 = (window as any).SQL = await (window as any).initSqlJs({
            // Required to load the wasm binary asynchronously. Of course, you can host it wherever you want
            // You can omit locateFile completely when running in node
            locateFile: (file: any) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.4.0/dist/${file}`
        });
        SQLiteConnection.DatabaseConstructor = Sqlite3.Database;

        this.transpile();
    }

    async extractDatabaseTables() {
        this.tables = [];
        for (const db of this.databases) {
            if (db.adapter instanceof SQLDatabaseAdapter) {
                const tables = db.adapter.platform.createTables([...db.entities]);
                for (const table of tables) {
                    this.dql = db.adapter.platform.getAddTableDDL(table).join('\n');
                }
            }

            for (const entity of db.entities) {
                this.tables.push({
                    name: entity.getName(),
                    columns: entity.propertyNames,
                    items: await db.query(entity).find()
                });
            }
        }
    }

    async transpile() {
        if (!this.editor) return;
        const model = this.editor.getModel();
        if (!model) return;

        this.js = transpile(this.editor ? model.getValue() : this.ts, {
            target: ScriptTarget.ES2018,
            module: ModuleKind.CommonJS,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
        }).trim();

        const old = {
            log: console.log,
        };

        console.log = (...args: any[]) => {
            this.logs.push(args.map(v => JSON.stringify(v)).join(' '));
        };

        for (const db of this.databases) {
            db.disconnect();
        }

        this.databases.length = 0;
        this.logs.length = 0;
        const dbs = this.databases;
        const registeredEntities = { ...getGlobalStore().RegisteredEntities };
        getGlobalStore().RegisteredEntities = {};

        class LoggedDatabase extends Database {
            constructor(adapter: any, schemas: (ClassType | ClassSchema)[] = []) {
                super(adapter, schemas);
                dbs.push(this);
            }
        }

        try {
            await new Function('require', 'exports', 'return async function() { ' + this.js + '}')((id: string) => {
                if (id === '@deepkit/type') {
                    return type;
                }
                if (id === '@deepkit/orm') {
                    return { ...orm, Database: LoggedDatabase };
                }
                if (id === '@deepkit/sqlite') {
                    return sqlJs;
                }
            }, {})();

        } finally {
            Object.assign(console, old);
        }
        getGlobalStore().RegisteredEntities = registeredEntities;
        await this.extractDatabaseTables();

        this.cd.detectChanges();
    }
}
