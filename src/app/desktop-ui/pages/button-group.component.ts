import { Component } from '@angular/core';

@Component({
    selector: 'page-button-group',
    template: `
        <h1>Button group</h1>
        
    <textarea codeHighlight>
import {DuiButtonModule} from '@deepkit/desktop-ui';
    </textarea>

    <p>
        <dui-button-group padding="none">
            <dui-button textured>Cool</dui-button>
            <dui-button textured [active]="true">Right</dui-button>
            <dui-button textured>Yes</dui-button>
        </dui-button-group>
    </p>

    <p>
        <dui-button-group padding="none">
            <dui-button>Cool</dui-button>
            <dui-button>Right</dui-button>
            <dui-button>Yes</dui-button>
        </dui-button-group>
    </p>

    <p>
        <dui-button-group>
            <dui-button>Cool</dui-button>
            <dui-button>Right</dui-button>
            <dui-button>Yes</dui-button>
        </dui-button-group>
    </p>

    <p>
        <dui-button-group padding="none">
            <dui-button square icon="add"></dui-button>
            <dui-button square icon="remove"></dui-button>
        </dui-button-group>
    </p>
    <div>
        <dui-button-group padding="none">
            <dui-button textured>Split button</dui-button>
            <dui-button textured tight icon="arrow_down" [openDropdown]="dropdown1"></dui-button>
        </dui-button-group>
        <dui-dropdown #dropdown1>
            <div style="padding: 5px 25px;">
                Hi there!
                <dui-button (click)="dropdown1.close()">Thanks!</dui-button>
            </div>
        </dui-dropdown>
    </div>

    <api-doc module="components/button/button.component" component="ButtonGroupComponent"></api-doc>
    `
})
export class ButtonGroupComponent {
}
