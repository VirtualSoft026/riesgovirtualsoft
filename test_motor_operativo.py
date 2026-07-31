import unittest
from motor_operativo import MicroStrategyConnector

class TestMicroStrategyConnector(unittest.TestCase):
    def setUp(self):
        self.connector = MicroStrategyConnector()

    def test_extract_flat_data_no_corruption(self):
        """
        Prueba que el método extract_flat_data extrae correctamente los datos
        sin usar popitem() y sin corromper/mutar los nodos originales, 
        lo cual causaba que las ramas posteriores perdieran su data.
        """
        # Simulamos un árbol de respuesta de MSTR con ramas anidadas
        mock_tree = {
            "children": [
                {
                    "element": {
                        "formValues": {"form1": "Root User"}
                    },
                    "children": [
                        {
                            "element": {
                                "formValues": {"form1": "Aprobado"}
                            }
                        },
                        {
                            "element": {
                                "formValues": {"form1": "Rechazado"}
                            }
                        }
                    ]
                }
            ]
        }
        
        # Mantenemos una copia profunda en mente. Si el código usa popitem(),
        # la segunda iteración en 'children' fallaría o daría resultados incompletos/KeyError.
        all_rows = []
        self.connector.extract_flat_data(mock_tree, [], all_rows)
        
        # Deberíamos tener dos filas extraídas que descienden desde la misma raíz
        self.assertEqual(len(all_rows), 2, "Debería haber extraído 2 filas completas")
        
        self.assertEqual(all_rows[0], ["Root User", "Aprobado"], "La primera fila debe contener los valores de la primera rama")
        self.assertEqual(all_rows[1], ["Root User", "Rechazado"], "La segunda fila debe contener la raíz intacta (no popitem) y el segundo nodo")
        
        # Validamos que el nodo raíz original NO ha sido mutado
        root_form_values = mock_tree["children"][0]["element"]["formValues"]
        self.assertIn("form1", root_form_values, "El nodo raíz no debe haber sido mutado por popitem()")
        self.assertEqual(root_form_values["form1"], "Root User")

if __name__ == "__main__":
    unittest.main()
