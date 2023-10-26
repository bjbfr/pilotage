namespace Pilotage {

    /***
     * enum Category
     */
    export enum Category {
        TE = "tax_expense",
        FE = "financial_expence",
        ME = "management_expense",
        SI = "scpi_income",
        CI = "contrib_income",
        O = "other"
    }
    /**
     * enum Counterpart
     */
    export enum Counterpart {
        BB = "M BENJAMIN BOUCHARD",
        QT = "Qonto",
        CF = "SA CREDIT FONCIER DE FRANCE",
        EP = "SCPI EPARGNE PIERRE",
        FP = "DGFIP",
        CP = "Comptable",
        SH = "Shine"
    }
    /**
     * 
     */
    export enum Credit_Debit {
        C = "Crédit",
        D = "Débit"
    }
    /**
     * type representing format of transactions
    */
    export type Transaction = { Date: string, Montant: number, Credit_Debit: Credit_Debit, Solde: number, Counterpart: Counterpart, AccountingYear: string, Src: string, Reference?: string, Category?: Category }

    type StringKeyOf<BaseType> = Extract<keyof BaseType, string>;
    /**
     * type representing keys of type Transaction
     * equivalent to type TransactionKey = "Date" | "Montant" | ...
     */
    export type TransactionKey = StringKeyOf<Transaction>
    /**
     * Parametric type to represent types associated with keys of type Transaction, eg:
     * 
     * const category: TransactionKeyType<"Category"> = Counterpart.QT
     * const credit:TransactionKeyType<"Credit_Debit"> = "Crédit"
     */
    export type TransactionKeyType<KType extends TransactionKey> = Transaction[KType]
    /**
     * type representing transformations to be applied to raw data
     */
    type Transform = {
        row_filtering?: Array<(r: Obj_t) => boolean>,
        column_derivation?: Array<[string, (r: Obj_t) => any] | [string[], (r: Obj_t) => any[]]>
    }
    /**
     * 
     */
    const credit_debit = (o: Obj_t) => o["Montant"] > 0 ? "Crédit" : "Débit"
    /**
     * 
     */
    const split_trim = (x: string) => x.split(' - ').map((s: string) => s.trim())
    const shine_split_libelle = (o: Obj_t) => split_trim(o["Libellé"].toString())
    /**
     * Treats column ""Libellé"" in shine file to find Counterpart
     * @param o 
     * @returns 
     */
    const shine_counterpart = (o: Obj_t) => {
        const libelles = shine_split_libelle(o);
        const from = libelles.find((x: string) => x.includes('De:'))
        if (from) {
            return from.replace('De:', '').trim().replace(/\s{2,}/, ' ')
        } else {
            if (libelles[0].includes('Abonnement Shine'))
                return "Shine"
            else if (libelles[0].includes('SA CREDIT FONCIER DE FRANCE'))
                return 'SA CREDIT FONCIER DE FRANCE'
            else
                return o["Libellé"]; // by default return the whole column
        }
    }
    /**
     * 
     * @param counterpart 
     * @returns 
     */
    const counterpart_mapping: { [index: string]: string } = {
        "BOUCHARD": "M BENJAMIN BOUCHARD",
        "DCN SCP BASSOT-ROBINEAU-EXARE": "M BENJAMIN BOUCHARD",
        "Direction Générale des Finances Publiques": "DGFIP",
        "SASU NAULIER GP": "Comptable",
        "Benjamin BOUCHARD": "M BENJAMIN BOUCHARD",
        "Direction Générale des Finances Publiques (DGFIP)": "DGFIP",
        "EURL NAULIER LMNP": "Comptable",
        "HEXAGONAL": "Comptable",
        "M  BOUCHARD BENJAMIN": "M BENJAMIN BOUCHARD",
        "NL   ASSOCIES PARTICULIERS": "Comptable",
        "NL  ASSOCIES UNBEC": "Comptable",
        "M BOUCHARD BENJAMIN": "M BENJAMIN BOUCHARD",
        "SCPI Epargne Pierre": "SCPI EPARGNE PIERRE"
    }
    function map_counterpart(counterpart: string) {
        const mapped_counterpart = counterpart_mapping[counterpart]
        counterpart = mapped_counterpart ? mapped_counterpart : counterpart;
        return Utils.fromString(Counterpart, counterpart)
    }
    /**
     * 
     * @param o 
     */
    function category(o: Obj_t) {
        const counterpart = Utils.fromString(Counterpart, o["Counterpart"]);
        const credit_debit = Utils.fromString(Credit_Debit, o["Credit_Debit"]);
        if (credit_debit === Credit_Debit.C) // "Crédit"
        {
            if (counterpart === Counterpart.BB)
                return Category.CI; // contrib_income
            else if (counterpart === Counterpart.EP)
                return Category.SI; // scpi_income
        } else if (credit_debit === Credit_Debit.D) {

            if (counterpart === Counterpart.CF)
                return Category.FE; // financial_expense
            else if (counterpart === Counterpart.FP)
                return Category.TE; // tax_expense
            else if (counterpart === Counterpart.QT || counterpart === Counterpart.SH)
                return Category.ME; // management_expense
        }
        return Category.O
    }
    /**
     * 
     * @param o 
     */
    function accounting_year(o: Obj_t) {
        // year
        const [_, m, y] = o["Date"].split('/');
        if (m === "01" && Utils.fromString(Counterpart, o["Counterpart"]) === Counterpart.EP)
            return `${parseInt(y) - 1}`;
        return `${y}`;
    }
    /**
     * 
     */
    const transaction_settings: { [index: string]: { hasHeader: boolean, sep: string, eol: string, quoted_values: boolean, reverse: boolean, transform: Transform } } =
    {
        "qonto1": {
            hasHeader: true, sep: ";", eol: "\n", quoted_values: true, reverse: true,
            transform: {
                // Transaction with "BB IMMO" are due to qonto historical account and shall be filtered out.
                row_filtering: [
                    (o: Obj_t) => o["counterpart_name"].toString().trim() !== "BB IMMO"
                ],
                column_derivation: [
                    ["Date", (o: Obj_t) => Utils.format_date_str(o["settlement_date_local"], "dd-MM-yyyy HH:mm:ss")],
                    ["Montant", (o: Obj_t) => Utils.convertFloat(o["local_amount"].toString())],
                    ["Credit_Debit", credit_debit],
                    ["Counterpart", (o: Obj_t) => map_counterpart(o["counterpart_name"].toString())],
                    ["AccountingYear", accounting_year],
                    ["Category", category],
                    ["Reference", (o: Obj_t) => split_trim(o["comment"])[0]]
                ]
            }
        },
        "qonto2": {
            hasHeader: true, sep: ";", eol: "\n", quoted_values: false, reverse: true,
            transform: {
                // Transaction with "BB IMMO" are due to qonto historical account and shall be filtered out.
                row_filtering: [
                    (o: Obj_t) => o["Nom de la contrepartie"].toString().trim() !== "BB IMMO"
                ],
                column_derivation: [
                    ["Date", (o: Obj_t) => Utils.format_date_str(o["Date de la valeur (local)"], "dd-MM-yyyy HH:mm:ss")],
                    ["Montant", (o: Obj_t) => Utils.convertFloat(o["Montant total (TTC) (local)"].toString())],
                    ["Credit_Debit", credit_debit],
                    ["Solde", (o: Obj_t) => Utils.convertFloat(o["Solde"].toString())],
                    ["Counterpart", (o: Obj_t) => map_counterpart(o["Nom de la contrepartie"].toString())],
                    ["AccountingYear", accounting_year],
                    ["Category", category],
                    ["Reference", (o: Obj_t) => {
                        const counterpart = Utils.fromString(Counterpart, o["Counterpart"]);
                        if (counterpart)
                            if ([Counterpart.CF, Counterpart.FP, Counterpart.EP].indexOf(counterpart) !== -1)
                                return o["Référence"]
                            else
                                return ""
                    }]
                ]
            }
        },
        "shine": {
            hasHeader: true, sep: ";", eol: "\r\n", quoted_values: false, reverse: false,
            transform: {
                column_derivation: [
                    [
                        ["Montant", "Credit_Debit"], (o: Obj_t) => {
                            const debit = o["Débit"].toString();
                            if (debit)
                                return [-1 * Utils.convertFloat(debit), "Débit"]
                            else {
                                const credit = o["Crédit"].toString();
                                return [Utils.convertFloat(credit), "Crédit"]
                            }
                        }
                    ],
                    [
                        "Solde", (o: Obj_t) => Utils.convertFloat(o["Solde bancaire"].toString())
                    ],
                    [
                        "Counterpart", (o: Obj_t) => {
                            const counterpart = shine_counterpart(o);
                            return map_counterpart(counterpart);
                        }
                    ],
                    ["AccountingYear", accounting_year],
                    ["Category", category],
                    [
                        "Reference", (o: Obj_t) => {
                            const libelles = shine_split_libelle(o);
                            if (libelles.length === 2 && Utils.fromString(Counterpart, o["Counterpart"]) === Counterpart.CF)
                                return libelles[1];
                            else if (Utils.fromString(Counterpart, o["Counterpart"]) === Counterpart.EP)
                                return libelles[0];
                            return "";
                        }
                    ],
                ]
            }
        }
    }
    /**
     * 
     * @param fileDesc 
     * @param source 
     * @returns 
     */
    export function get_transactions(fileDesc: Fs.FileDesc, source: string) {
        const { sep, eol, hasHeader, transform, quoted_values, reverse } = transaction_settings[source];
        const csv_data = Fs.csv_data(fileDesc, (fileDesc: Fs.FileDesc) => ({ header: ['Src'], values: [`${source}/${fileDesc.name}`] }), hasHeader, sep, eol, quoted_values);
        if (csv_data) {
            let obj_data = Utils.obj_from_csv(csv_data);
            const { row_filtering, column_derivation } = transform;
            if (row_filtering)
                row_filtering.forEach(filtering => obj_data = obj_data.filter(filtering))
            if (column_derivation) {

                for (const [new_column, f] of column_derivation) {
                    if (typeof new_column === "string")  // new_colum is a string
                        obj_data.forEach(o => o[new_column] = f(o))
                    else { // new_column is an string[]
                        obj_data.forEach(
                            o => {
                                const values = f(o);
                                for (const i in new_column) {
                                    o[new_column[i]] = values[i];
                                }
                            }
                        )
                    }
                }
            }
            if (reverse)
                obj_data = obj_data.reverse()
            //compute Solde if missing.
            if (Object.keys(obj_data[0]).indexOf('Solde') === -1)
                obj_data.reduce((prev_solde: number, o: Obj_t) => {
                    o["Solde"] = prev_solde + o["Montant"];
                    return o["Solde"]
                }, 0.0)
            //select needed keys
            const keys: TransactionKey[] = ["Date", "Montant", "Credit_Debit", "Solde", "Counterpart", "AccountingYear", "Category", "Reference", "Src"];
            obj_data = obj_data.map(o => Obj.pick_keys(o, keys));
            return obj_data;
        }
        return;
    }

}
