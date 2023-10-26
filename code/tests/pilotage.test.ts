/// <reference path="../pilotage.ts"/>

function pilotage_test_synchronize() {

    const sheet = SpreadsheetApp.openById('1EV9xKQSOR9Lf_oeMyM9zKTG2ffiXKmZu6Fu0NfIf2zY').getSheetByName('Transactions');
    const shine_data = Pilotage.get_transactions({ id: "1MV-SUmXsFnL8smh1l63zWy328bDlHXI1", name: "BQ_07-2023_02-10-2023.csv", type: Fs.MineType.TEXT }, "shine");
    if (sheet && shine_data)
        Spreadsheet.synchronize(sheet, shine_data, ["Date", "Montant", "Counterpart"])
}

function pilotage_test_qonto1() {
    const res = Pilotage.get_transactions({ id: "1yoIOIv6jEzycpkc7Vwk5OjM1RquOqtJr", name: "2023-10-12_19-58-30_bb_immo_qonto_extended.csv", type: Fs.MineType.TEXT }, "qonto1")
    return res
}

function pilotage_test_qonto2() {
    const res = Pilotage.get_transactions({ id: "1J5B7jgrQEDnJ2UfdHIra6M3gAsQrBfyz", name: "2023-10-10_20-06-10_bb_immo.csv", type: Fs.MineType.TEXT }, "qonto2");
    return res
}

function pilotage_test_shine() {
    const res = Pilotage.get_transactions({ id: "1MV-SUmXsFnL8smh1l63zWy328bDlHXI1", name: "BQ_07-2023_02-10-2023.csv", type: Fs.MineType.TEXT }, "shine");
    return res
}

// test_all
function pilotage_test_all() {
    return Unittest.run_all([])
}
