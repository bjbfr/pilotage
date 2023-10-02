namespace Pilotage {

    export function init_handler() {
        Ui.alert_user("Init handler", "hello");
    }

    export function onOpen() {
        Ui.add_menu(
          'SASU BB-IMMO',
          [
            {item:'Init',handler:`Pilotage.${Pilotage.init_handler.name}`}
          ]
        );
    }

}