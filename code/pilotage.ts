namespace Pilotage {

  export function init_handler() {
    Ui.alert_user("Init handler", "Hello, World!");
  }
  /**
   * 
   */
  export function load_handler() {
    // sheet where to store transactions
    const sheet = Spreadsheet.get_sheet_by_property("transactionsSheetName");
    const pivotSheet = Spreadsheet.get_sheet_by_property("pivotTableSheetName");

    if (sheet) {
      //folder where to find src folders
      const dataSrcFolder = Properties.getProperty("dataSrcFolder");
      // list src folders
      const folders = Fs.list_dirs(dataSrcFolder);
      // foreach src folder
      let res = [] as Array<{ src: string, n: number }>
      for (const { id: dirId, name } of folders) {
        const files = Fs.list_files(dirId);
        for (const fileDesc of files) {
          const transactions = get_transactions(fileDesc, name);
          if (sheet && transactions) {
            // synchronize sheet with identifiers: ["Date", "Montant", "Counterpart"]
            const n = Spreadsheet.synchronize(sheet, transactions, ["Date", "Montant", "Counterpart"]);
            if (n > 0)
              res.push({ src: `${name}/${fileDesc.name}`, n: n });
          }
        }// for
      }// for

      //set columns auto-size and filter and banding
      if (res.length > 0) {
        const limits = Spreadsheet.get_limits(sheet);
        if (limits) {
          const range = Spreadsheet.get_tabular_range(sheet, limits);
          // auto-size
          Spreadsheet.auto_size_columns(sheet, limits);
          //filter
          Spreadsheet.remove_filter(sheet);
          Sheetrange.set_filter(range);
          //banding
          Sheetrange.set_banding(range, SpreadsheetApp.BandingTheme.BLUE);
          // add pivot table
          // const { firstRow, lastColumn } = limits;
          // const anchor = sheet.getRange(firstRow, lastColumn + 2);
          // Spreadsheet.remove_pivot_table(sheet);
          if (pivotSheet)
            Spreadsheet.add_pivot_table(pivotSheet, range, ["Counterpart"], ["AccountingYear", "Date"], [["Montant", SpreadsheetApp.PivotTableSummarizeFunction.SUM]])
        }

        const msg = "Transactions added:\n" + res.map(({ src, n }) => `- ${src}: ${n}`).join('\n')
        Ui.alert_user("Load transactions", msg);
      }
      else {
        Ui.alert_user("Load transactions", "No transactions added.");
      }
    } else {
      const msg = `Cannot find sheet to add transactions.`;
      console.log(msg);
      Ui.alert_user("Load transactions", msg);
    }
  }
  /**
   * 
   */
  export function onOpen() {
    Ui.add_menu(
      'SASU BB-IMMO',
      [
        { item: 'Init', handler: `Pilotage.${Pilotage.init_handler.name}` },
        { item: 'Load', handler: `Pilotage.${Pilotage.load_handler.name}` }
      ]
    );
  }

}
